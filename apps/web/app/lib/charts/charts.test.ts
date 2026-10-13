import { describe, expect, test } from 'vitest'

import { DYNAMIC_SPECTRUM_CHART, layoutDynamicSpectrum } from './dynamicSpectrumLayout'
import { layoutTimeSeries, TIME_SERIES_CHART } from './timeSeriesLayout'

describe('layoutTimeSeries', () => {
  test('returns nothing to draw for an empty series', () => {
    expect(layoutTimeSeries([])).toBeNull()
  })

  test('spans the plot from the first to the last instant and labels the midpoint', () => {
    const layout = layoutTimeSeries([
      { timestamp: '2026-09-10T08:00:00Z', value: 10 },
      { timestamp: '2026-09-10T09:00:00Z', value: 30 },
      { timestamp: '2026-09-10T10:00:00Z', value: 20 },
    ])!

    expect(layout.coordinates[0]!.x).toBe(TIME_SERIES_CHART.left)
    expect(layout.coordinates.at(-1)!.x).toBe(TIME_SERIES_CHART.width - TIME_SERIES_CHART.right)
    expect(layout.middleTimestamp).toBe('2026-09-10T09:00:00.000Z')
    expect(layout.minimum).toBe(10)
    expect(layout.maximum).toBe(30)
    // The highest value sits above the lowest one.
    expect(layout.coordinates[1]!.y).toBeLessThan(layout.coordinates[0]!.y)
    expect(layout.gridLines.map((line) => line.ratio)).toEqual([0, 0.5, 1])
    expect(layout.pointRadius).toBe(3)
  })

  test('centres a single reading and shrinks the markers of a dense series', () => {
    const single = layoutTimeSeries([{ timestamp: '2026-09-10T08:00:00Z', value: 0 }])!
    expect(single.coordinates[0]!.x).toBe(TIME_SERIES_CHART.left + single.plotWidth / 2)

    const dense = layoutTimeSeries(
      Array.from({ length: 61 }, (_, minute) => ({
        timestamp: new Date(Date.UTC(2026, 8, 10, 8, minute)).toISOString(),
        value: minute,
      })),
    )!
    expect(dense.pointRadius).toBe(1.5)
  })
})

describe('layoutDynamicSpectrum', () => {
  test('returns nothing to draw when an axis is empty', () => {
    expect(layoutDynamicSpectrum({ cells: [], frequencies: [100], timestamps: ['t'] })).toBeNull()
  })

  test('places the lowest frequency at the bottom and scales intensity from 0 to 1', () => {
    const layout = layoutDynamicSpectrum({
      timestamps: ['2026-09-10T08:00:00Z', '2026-09-10T08:10:00Z'],
      frequencies: [100, 200],
      cells: [
        { timestamp: '2026-09-10T08:00:00Z', frequency: 100, value: 1 },
        { timestamp: '2026-09-10T08:00:00Z', frequency: 200, value: 3 },
        { timestamp: '2026-09-10T08:10:00Z', frequency: 100, value: 5 },
        { timestamp: '2026-09-10T08:10:00Z', frequency: 200, value: 2 },
      ],
    })!

    const [low, high, later] = layout.rects
    expect(low!.x).toBe(DYNAMIC_SPECTRUM_CHART.left)
    expect(low!.y).toBeGreaterThan(high!.y)
    expect(later!.x).toBeGreaterThan(low!.x)
    expect(low!.intensity).toBe(0)
    expect(later!.intensity).toBe(1)
    expect(layout.lowestFrequency).toBe(100)
    expect(layout.highestFrequency).toBe(200)
  })

  test('uses a middle intensity when every cell has the same value', () => {
    const layout = layoutDynamicSpectrum({
      timestamps: ['t'],
      frequencies: [100],
      cells: [{ timestamp: 't', frequency: 100, value: 7 }],
    })!

    expect(layout.rects[0]!.intensity).toBe(0.5)
  })
})
