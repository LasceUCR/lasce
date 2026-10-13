import type { ScientificDataPoint } from '@/app/lib/scientific-data'

/**
 * Geometry of the `/datos` time-series chart, shared by the on-screen SVG
 * (`ScientificDataChart`) and the downloadable PNG (`app/services/downloads/exporters/png.ts`)
 * so the image a user downloads is the chart they saw.
 */
export const TIME_SERIES_CHART = {
  height: 320,
  width: 760,
  top: 28,
  right: 28,
  bottom: 54,
  left: 74,
} as const

export interface TimeSeriesCoordinate extends ScientificDataPoint {
  x: number
  y: number
}

export interface TimeSeriesLayout {
  minimum: number
  maximum: number
  plotWidth: number
  plotHeight: number
  coordinates: TimeSeriesCoordinate[]
  /** `points` attribute of the series polyline. */
  path: string
  /** Horizontal grid lines at the top, middle and bottom, with the value each one marks. */
  gridLines: { ratio: number; y: number; value: number }[]
  firstTimestamp: string
  middleTimestamp: string
  lastTimestamp: string
  pointRadius: number
}

/** Lays out a non-empty series; `null` when there is nothing to draw. */
export function layoutTimeSeries(points: ScientificDataPoint[]): TimeSeriesLayout | null {
  if (!points.length) return null

  const chart = TIME_SERIES_CHART
  const values = points.map((point) => point.value)
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const valueRange = maximum - minimum || Math.abs(maximum) * 0.1 || 1
  const plotWidth = chart.width - chart.left - chart.right
  const plotHeight = chart.height - chart.top - chart.bottom

  const firstInstant = Date.parse(points[0]!.timestamp)
  const lastInstant = Date.parse(points.at(-1)!.timestamp)
  const duration = lastInstant - firstInstant
  const coordinates = points.map((point) => {
    const x =
      chart.left +
      (duration === 0
        ? plotWidth / 2
        : ((Date.parse(point.timestamp) - firstInstant) / duration) * plotWidth)
    const y =
      chart.top + ((maximum - point.value + valueRange * 0.08) / (valueRange * 1.16)) * plotHeight
    return { ...point, x, y }
  })

  return {
    minimum,
    maximum,
    plotWidth,
    plotHeight,
    coordinates,
    path: coordinates.map(({ x, y }) => `${x},${y}`).join(' '),
    gridLines: [0, 0.5, 1].map((ratio) => ({
      ratio,
      y: chart.top + ratio * plotHeight,
      value: maximum + valueRange * 0.08 - ratio * valueRange * 1.16,
    })),
    firstTimestamp: points[0]!.timestamp,
    middleTimestamp: new Date(firstInstant + duration / 2).toISOString(),
    lastTimestamp: points.at(-1)!.timestamp,
    pointRadius: points.length > 60 ? 1.5 : 3,
  }
}
