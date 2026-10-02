import { z } from 'zod'

import {
  findScientificProduct,
  type ScientificDataQuery,
  type TimeSeriesDataResult,
} from '@/app/lib/scientific-data'

import { buildGoesTimeSeriesResult } from './goesTimeSeriesResult'
import { queryInfluxSql } from './influxSql'

const EXIS_PRODUCTS = new Set(['SFEU', 'SFXR'])
const MAX_POINTS = 360

/*
 * Samples inside InfluxDB so at most ~360 rows per satellite cross the wire (SFXR is stored at
 * 1 s, ~86 000 points a day): the first reading, then every `stride`-th, plus the last one.
 * `stride` is chosen so the first group alone never exceeds 360; keeping the last reading can add
 * one more, trimmed in TypeScript. Nothing is averaged or interpolated. Readings withdrawn by a
 * re-ingest (`valid = false`, see docs/exis-pipeline.md) are excluded before numbering, so they
 * never count toward `n` or the sampling.
 */
const SAMPLED_READINGS_SQL = `
SELECT time, value, satellite, n FROM (
  SELECT time, value, satellite,
         ROW_NUMBER() OVER (PARTITION BY satellite ORDER BY time) AS rn,
         COUNT(*) OVER (PARTITION BY satellite) AS n
  FROM exis_irradiance
  WHERE product = $product AND channel = $channel AND valid = true
    AND time >= $start AND time <= $end
) WHERE (rn - 1) % CAST(GREATEST(CEIL((n - 1) / ${MAX_POINTS - 1}.0), 1) AS BIGINT) = 0 OR rn = n
ORDER BY time`

const readingRow = z.object({
  time: z.string(),
  value: z.number().finite(),
  satellite: z.string(),
  n: z.number().int().nonnegative(),
})

type Reading = z.infer<typeof readingRow>

/** InfluxDB returns naive UTC timestamps (`2026-09-27T00:00:00.377369`); make them explicit. */
function toIsoTimestamp(time: string) {
  return /(Z|[+-]\d{2}:\d{2})$/.test(time) ? time : `${time}Z`
}

/** `"G19"` → `19`; `null` for a `platform_ID` that does not name a GOES spacecraft. */
function satelliteNumber(satellite: string): number | null {
  const match = satellite.match(/^G(\d+)$/i)
  return match ? Number(match[1]) : null
}

/** Never mix spacecraft in one series: keep the one that observed most recently. */
function latestSatelliteReadings(readings: Reading[]) {
  const satellite = readings.at(-1)?.satellite
  const kept = readings.filter((reading) => reading.satellite === satellite)
  if (kept.length > MAX_POINTS) kept.splice(-2, 1)
  return { satellite, readings: kept, total: kept[0]?.n ?? 0 }
}

/**
 * EXIS (SFEU, SFXR) series from the readings the worker's `exis-pipeline` stores in InfluxDB
 * (`exis_irradiance`). Only ingested days have data; any other day is an empty series.
 */
export async function queryExisReadings(query: ScientificDataQuery): Promise<TimeSeriesDataResult> {
  const selection = findScientificProduct(query.source, query.product)
  if (query.source !== 'GOES' || !selection || !EXIS_PRODUCTS.has(selection.product.code)) {
    throw new Error('The EXIS readings only accept SFEU and SFXR')
  }

  const rows = await queryInfluxSql(
    SAMPLED_READINGS_SQL,
    {
      product: query.product,
      channel: query.parameter,
      start: `${query.date}T${query.startTime}:00Z`,
      end: `${query.date}T${query.endTime}:59.999Z`,
    },
    readingRow,
  )
  const { satellite, readings, total } = latestSatelliteReadings(rows)
  const sampled = total > MAX_POINTS

  return buildGoesTimeSeriesResult(
    query,
    readings.map(({ time, value }) => ({ timestamp: toIsoTimestamp(time), value })),
    {
      provider: 'CITIC-UCR — lecturas EXIS nivel 1b de NOAA',
      notice:
        'Lecturas EXIS nivel 1b ingeridas diariamente por CITIC-UCR; NOAA publica cada día con aproximadamente un día de retraso. Se excluyen valores de relleno, negativos y observaciones marcadas con calidad degradada o inválida.' +
        (sampled
          ? ` Se muestran ${MAX_POINTS} observaciones distribuidas uniformemente en el intervalo; no se interpolaron valores.`
          : ''),
      satellite: satellite ? satelliteNumber(satellite) : null,
    },
  )
}
