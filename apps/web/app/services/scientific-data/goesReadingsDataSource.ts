import { z } from 'zod'

import {
  findScientificProduct,
  summarizeValues,
  type ScientificDataQuery,
  type ScientificDataset,
  type TimeSeriesDataResult,
} from '@/app/lib/scientific-data'

import { extremeBuckets, keepExtremes } from './extremeSampling'
import { buildGoesTimeSeriesResult } from './goesTimeSeriesResult'
import { queryInfluxSql } from './influxSql'

const MAX_POINTS = 360
const BUCKETS = extremeBuckets(MAX_POINTS)

/*
 * Reduces inside InfluxDB so at most 360 rows per satellite cross the wire (SFXR is stored at
 * 1 s, ~86 000 points a day), with the rule of `keepExtremes`: the window is cut into `BUCKETS`
 * (179) stretches by row number, and each keeps its lowest and its highest reading, plus the first
 * and the last reading. A window of 360 readings or fewer comes back whole. Nothing is averaged or
 * interpolated, so a flare's peak is always drawn.
 *
 * `minimum` and `maximum` are window aggregates over every reading of the satellite, so the
 * summary beside the chart never depends on the reduction; the latest reading is always kept.
 * Readings withdrawn by a re-ingest (`valid = false`, see docs/exis-pipeline.md) are excluded
 * before numbering, so they never count toward `n`, the stretches or the summary.
 */
function sampledReadingsSql(measurement: string) {
  return `
SELECT time, value, satellite, n, minimum, maximum FROM (
  SELECT time, value, satellite, rn, n, minimum, maximum,
         ROW_NUMBER() OVER (PARTITION BY satellite, bucket ORDER BY value ASC, time) AS low,
         ROW_NUMBER() OVER (PARTITION BY satellite, bucket ORDER BY value DESC, time) AS high
  FROM (
    SELECT time, value, satellite, rn, n, minimum, maximum,
           CAST((rn - 1) * ${BUCKETS} / n AS BIGINT) AS bucket
    FROM (
      SELECT time, value, satellite,
             ROW_NUMBER() OVER (PARTITION BY satellite ORDER BY time) AS rn,
             COUNT(*) OVER (PARTITION BY satellite) AS n,
             MIN(value) OVER (PARTITION BY satellite) AS minimum,
             MAX(value) OVER (PARTITION BY satellite) AS maximum
      FROM ${measurement}
      WHERE product = $product AND channel = $channel AND valid = true
        AND time >= $start AND time <= $end
    )
  )
) WHERE n <= ${MAX_POINTS} OR rn = 1 OR rn = n OR low = 1 OR high = 1
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

const sampledRow = readingRow.extend({
  minimum: z.number().finite(),
  maximum: z.number().finite(),
})

type SampledReading = z.infer<typeof sampledRow>

/** InfluxDB returns naive UTC timestamps (`2026-09-27T00:00:00.377369`); make them explicit. */
function toIsoTimestamp(time: string) {
  return /(Z|[+-]\d{2}:\d{2})$/.test(time) ? time : `${time}Z`
}

/** `"G19"` → `19`; `null` for a `platform_ID` that does not name a GOES spacecraft. */
function satelliteNumber(satellite: string): number | null {
  const match = satellite.match(/^G(\d+)$/i)
  return match ? Number(match[1]) : null
}

/**
 * Never mix spacecraft in one series: keep the one that observed most recently. `keepExtremes`
 * only guards the point limit; the query has already reduced the rows the same way.
 */
function latestSatelliteReadings(rows: SampledReading[]) {
  const satellite = rows.at(-1)?.satellite
  const kept = rows.filter((reading) => reading.satellite === satellite)
  const first = kept[0]
  const last = kept.at(-1)
  return {
    satellite,
    readings: keepExtremes(kept, MAX_POINTS),
    total: first?.n ?? 0,
    summary:
      first && last
        ? { minimum: first.minimum, maximum: first.maximum, latest: last.value }
        : undefined,
  }
}

export interface GoesReadingsOptions {
  /** The InfluxDB measurement a worker pipeline writes, e.g. `exis_irradiance`. */
  measurement: string
  /** The catalogue product codes stored in that measurement. */
  products: readonly string[]
  /** The error raised for any other product. */
  unsupportedMessage: string
  /** Names the provider and notice a result is described with (`scientificData.origins`). */
  dataset: ScientificDataset
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

  /**
   * At most 360 readings of the latest satellite in the window, what the chart draws, with the
   * minimum, maximum and latest value of all of them.
   */
  async function readSampled(query: ScientificDataQuery): Promise<TimeSeriesDataResult> {
    const rows = await queryInfluxSql(sampledSql, readingParams(query), sampledRow)
    const { satellite, readings, total, summary } = latestSatelliteReadings(rows)
    const sampled = total > MAX_POINTS

    return buildGoesTimeSeriesResult(
      query,
      readings.map(({ time, value }) => ({ timestamp: toIsoTimestamp(time), value })),
      {
        dataset: options.dataset,
        resolution: 'sampled',
        ...(sampled ? { sampledPoints: readings.length } : {}),
        satellite: satellite ? satelliteNumber(satellite) : null,
      },
      summary,
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
        dataset: options.dataset,
        resolution: 'full',
        satellite: satellite ? satelliteNumber(satellite) : null,
      },
      summarizeValues(readings.map(({ value }) => value)) ?? undefined,
    )
  }

  return { query: readSampled, queryFull: readAll }
}
