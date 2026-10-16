import { z } from 'zod'

import {
  findScientificProduct,
  type ScientificDataQuery,
  type TimeSeriesDataResult,
} from '@/app/lib/scientific-data'

import { buildGoesTimeSeriesResult } from './goesTimeSeriesResult'
import { queryInfluxSql } from './influxSql'

const MAX_POINTS = 360

/*
 * Samples inside InfluxDB so at most ~360 rows per satellite cross the wire (SFXR is stored at
 * 1 s, ~86 000 points a day): the first reading, then every `stride`-th, plus the last one.
 * `stride` is chosen so the first group alone never exceeds 360; keeping the last reading can add
 * one more, trimmed in TypeScript. Nothing is averaged or interpolated. Readings withdrawn by a
 * re-ingest (`valid = false`, see docs/exis-pipeline.md) are excluded before numbering, so they
 * never count toward `n` or the sampling.
 */
function sampledReadingsSql(measurement: string) {
  return `
SELECT time, value, satellite, n FROM (
  SELECT time, value, satellite,
         ROW_NUMBER() OVER (PARTITION BY satellite ORDER BY time) AS rn,
         COUNT(*) OVER (PARTITION BY satellite) AS n
  FROM ${measurement}
  WHERE product = $product AND channel = $channel AND valid = true
    AND time >= $start AND time <= $end
) WHERE (rn - 1) % CAST(GREATEST(CEIL((n - 1) / ${MAX_POINTS - 1}.0), 1) AS BIGINT) = 0 OR rn = n
ORDER BY time`
}

/*
 * Every valid reading in the window, for data exports. The query schema limits a request to one
 * UTC day, so the worst case is one SFXR day: ~86 000 rows per satellite.
 */
function allReadingsSql(measurement: string) {
  return `
SELECT time, value, satellite, 0 AS n FROM ${measurement}
WHERE product = $product AND channel = $channel AND valid = true
  AND time >= $start AND time <= $end
ORDER BY time`
}

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

export interface GoesReadingsOptions {
  /** The InfluxDB measurement a worker pipeline writes, e.g. `exis_irradiance`. */
  measurement: string
  /** The catalogue product codes stored in that measurement. */
  products: readonly string[]
  /** The error raised for any other product. */
  unsupportedMessage: string
  provider: string
  /** The notice of a chart; the sampling sentence is appended when it applies. */
  notice: string
  /** The notice of a full-resolution export. */
  fullNotice: string
}

/**
 * GOES series read synchronously from the readings a worker pipeline stores in InfluxDB (tags
 * `satellite`, `product`, `channel`; fields `value`, `valid`). Only ingested days have data; any
 * other day is an empty series.
 */
export function createGoesReadings(options: GoesReadingsOptions) {
  const products = new Set(options.products)
  const sampledSql = sampledReadingsSql(options.measurement)
  const allSql = allReadingsSql(options.measurement)

  function readingParams(query: ScientificDataQuery) {
    const selection = findScientificProduct(query.source, query.product)
    if (query.source !== 'GOES' || !selection || !products.has(selection.product.code)) {
      throw new Error(options.unsupportedMessage)
    }
    return {
      product: query.product,
      channel: query.parameter,
      start: `${query.date}T${query.startTime}:00Z`,
      end: `${query.date}T${query.endTime}:59.999Z`,
    }
  }

  /** At most 360 readings of the latest satellite in the window: what the chart draws. */
  async function readSampled(query: ScientificDataQuery): Promise<TimeSeriesDataResult> {
    const rows = await queryInfluxSql(sampledSql, readingParams(query), readingRow)
    const { satellite, readings, total } = latestSatelliteReadings(rows)
    const sampled = total > MAX_POINTS

    return buildGoesTimeSeriesResult(
      query,
      readings.map(({ time, value }) => ({ timestamp: toIsoTimestamp(time), value })),
      {
        provider: options.provider,
        notice:
          options.notice +
          (sampled
            ? ` Se muestran ${MAX_POINTS} observaciones distribuidas uniformemente en el intervalo; no se interpolaron valores.`
            : ''),
        satellite: satellite ? satelliteNumber(satellite) : null,
      },
    )
  }

  /**
   * The same series without sampling: every stored reading of the latest satellite in the
   * window. Feeds the CSV export on `/datos`, never the chart, which stays at 360 points.
   */
  async function readAll(query: ScientificDataQuery): Promise<TimeSeriesDataResult> {
    const rows = await queryInfluxSql(allSql, readingParams(query), readingRow)
    const satellite = rows.at(-1)?.satellite
    const readings = rows.filter((reading) => reading.satellite === satellite)

    return buildGoesTimeSeriesResult(
      query,
      readings.map(({ time, value }) => ({ timestamp: toIsoTimestamp(time), value })),
      {
        provider: options.provider,
        notice: options.fullNotice,
        satellite: satellite ? satelliteNumber(satellite) : null,
      },
    )
  }

  return { query: readSampled, queryFull: readAll }
}
