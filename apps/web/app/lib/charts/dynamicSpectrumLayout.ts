import type { DynamicSpectrumCell } from '@/app/lib/scientific-data'

/**
 * Geometry of the `/datos` dynamic-spectrum chart, shared by `DynamicSpectrumChart` and the
 * downloadable PNG so both draw the same cells.
 */
export const DYNAMIC_SPECTRUM_CHART = {
  width: 760,
  height: 350,
  top: 28,
  right: 36,
  bottom: 54,
  left: 72,
} as const

export interface DynamicSpectrumRect {
  key: string
  x: number
  y: number
  width: number
  height: number
  /** 0 for the weakest cell, 1 for the strongest; colour is interpolated from it. */
  intensity: number
}

export interface DynamicSpectrumLayout {
  minimum: number
  maximum: number
  plotWidth: number
  rects: DynamicSpectrumRect[]
  firstTimestamp: string
  middleTimestamp: string
  lastTimestamp: string
  lowestFrequency: number
  highestFrequency: number
}

export interface DynamicSpectrumInput {
  cells: DynamicSpectrumCell[]
  frequencies: number[]
  timestamps: string[]
}

/** Lays out a non-empty spectrum; `null` when any axis is empty. */
export function layoutDynamicSpectrum({
  cells,
  frequencies,
  timestamps,
}: DynamicSpectrumInput): DynamicSpectrumLayout | null {
  if (!cells.length || !frequencies.length || !timestamps.length) return null

  const chart = DYNAMIC_SPECTRUM_CHART
  const values = cells.map(({ value }) => value)
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const plotWidth = chart.width - chart.left - chart.right
  const plotHeight = chart.height - chart.top - chart.bottom
  const cellWidth = plotWidth / timestamps.length
  const cellHeight = plotHeight / frequencies.length
  const timestampIndexes = new Map(timestamps.map((timestamp, index) => [timestamp, index]))
  const frequencyIndexes = new Map(frequencies.map((frequency, index) => [frequency, index]))

  return {
    minimum,
    maximum,
    plotWidth,
    rects: cells.map((cell) => {
      const xIndex = timestampIndexes.get(cell.timestamp)!
      const frequencyIndex = frequencyIndexes.get(cell.frequency)!
      return {
        key: `${cell.timestamp}-${cell.frequency}`,
        x: chart.left + xIndex * cellWidth,
        y: chart.top + (frequencies.length - frequencyIndex - 1) * cellHeight,
        width: cellWidth + 0.5,
        height: cellHeight + 0.5,
        intensity: maximum === minimum ? 0.5 : (cell.value - minimum) / (maximum - minimum),
      }
    }),
    firstTimestamp: timestamps[0]!,
    middleTimestamp: timestamps[Math.floor((timestamps.length - 1) / 2)]!,
    lastTimestamp: timestamps.at(-1)!,
    lowestFrequency: frequencies[0]!,
    highestFrequency: frequencies.at(-1)!,
  }
}
