import { describe, expect, test } from 'vitest'

import { DYNAMIC_SPECTRUM_CHART, layoutDynamicSpectrum } from './dynamicSpectrumLayout'
import {
  layoutTimeSeries,
  linearTicks,
  logDecades,
  TIME_SERIES_CHART,
  timeSeriesStyle,
} from './timeSeriesLayout'

function day(value: (index: number) => number, length = 360) {
  return Array.from({ length }, (_, index) => ({
    timestamp: new Date(Date.UTC(2026, 10, 5, 0, index * 4)).toISOString(),
    value: value(index),
  }))
}

describe('layoutTimeSeries', () => {
  test('returns nothing to draw for an empty series', () => {
    expect(layoutTimeSeries([])).toBeNull()
  })

  test('spans the plot from the first to the last instant and labels the ends and between', () => {
    const layout = layoutTimeSeries([
      { timestamp: '2026-09-10T08:00:00Z', value: 10 },
      { timestamp: '2026-09-10T09:00:00Z', value: 30 },
      { timestamp: '2026-09-10T10:00:00Z', value: 20 },
    ])!

    expect(layout.coordinates[0]!.x).toBe(TIME_SERIES_CHART.left)
    expect(layout.coordinates.at(-1)!.x).toBe(TIME_SERIES_CHART.width - TIME_SERIES_CHART.right)
    expect(layout.timeTicks.map(({ timestamp }) => timestamp.slice(11, 16))).toEqual([
      '08:00',
      '08:30',
      '09:00',
      '09:30',
      '10:00',
    ])
    expect(layout.timeTicks.map(({ anchor }) => anchor)).toEqual([
      'start',
      'middle',
      'middle',
      'middle',
      'end',
    ])
    expect(layout.minimum).toBe(10)
    expect(layout.maximum).toBe(30)
    expect(layout.peak.value).toBe(30)
    // The highest value sits above the lowest one.
    expect(layout.coordinates[1]!.y).toBeLessThan(layout.coordinates[0]!.y)
    expect(layout.pointRadius).toBe(3)
  })

  test('puts the linear axis on round values without reaching below zero', () => {
    // The former layout padded 8% below the minimum, to -2.181E-6 for this X-ray day.
    const layout = layoutTimeSeries(day((index) => (index === 200 ? 3.35e-5 : 2.1e-7)))!
    const values = layout.gridLines.map(({ value }) => value)

    expect(values).toEqual([0, 1e-5, 2e-5, 3e-5, 4e-5])
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0)
    // Bottom to top.
    expect(layout.gridLines[0]!.y).toBeGreaterThan(layout.gridLines.at(-1)!.y)
  })

  test('does not flatten a series that moves a few percent around its level', () => {
    expect(linearTicks(98.2, 101.7)).toEqual([98, 99, 100, 101, 102])
    expect(linearTicks(-12.3, 40.1)).toEqual([-20, 0, 20, 40, 60])
    expect(linearTicks(5, 5)).toEqual([4.9, 5, 5.1])
    expect(linearTicks(0, 0)).toEqual([0, 0.2])
  })

  test('draws X-ray flux on a log scale, one grid line per decade, with the flare classes', () => {
    const layout = layoutTimeSeries(
      day((index) => (index === 200 ? 3.35e-5 : 2.1e-7 + index * 1e-10)),
      timeSeriesStyle('SFXR', '0.1-0.8nm'),
    )!

    expect(layout.scale).toBe('log')
    expect(layout.gridLines.map(({ value }) => value)).toEqual([1e-7, 1e-6, 1e-5, 1e-4])
    expect(layout.flareBands.map(({ letter }) => letter)).toEqual(['B', 'C', 'M'])
    // B sits below C, which sits below M.
    const [b, c, m] = layout.flareBands
    expect(b!.y).toBeGreaterThan(c!.y)
    expect(c!.y).toBeGreaterThan(m!.y)
    expect(layout.peak.value).toBe(3.35e-5)
    expect(layout.peakClass?.label).toBe('M3.4')
    expect(layout.frame.right).toBeGreaterThan(TIME_SERIES_CHART.right)
  })

  test('shows at least two classes on a quiet day and none for the short band', () => {
    const quiet = layoutTimeSeries(
      day(() => 3e-7),
      timeSeriesStyle('SFXR', '0.1-0.8nm'),
    )!
    expect(quiet.flareBands.map(({ letter }) => letter)).toEqual(['B', 'C'])
    expect(quiet.peakClass?.label).toBe('B3.0')

    const shortBand = layoutTimeSeries(
      day(() => 3e-7),
      timeSeriesStyle('SFXR', '0.05-0.4nm'),
    )!
    expect(shortBand.scale).toBe('log')
    expect(shortBand.flareBands).toEqual([])
    expect(shortBand.peakClass).toBeNull()
  })

  test('keeps the magnetic field and EUV lines linear, negative values included', () => {
    expect(timeSeriesStyle('GEOF', 'EPN-x')).toEqual({ scale: 'linear', flareClasses: false })
    expect(timeSeriesStyle('SFEU', '304')).toEqual({ scale: 'linear', flareClasses: false })
    expect(timeSeriesStyle('SGPS', 'plus:P1')).toEqual({ scale: 'log', flareClasses: false })

    const field = layoutTimeSeries(day((index) => -40 + index / 10))!
    expect(field.gridLines[0]!.value).toBeLessThan(0)
  })

  test('leaves out values a log scale cannot draw, and falls back when none is positive', () => {
    const mixed = layoutTimeSeries(
      [
        { timestamp: '2026-11-05T00:00:00Z', value: 0 },
        { timestamp: '2026-11-05T00:01:00Z', value: 2e-6 },
      ],
      { scale: 'log' },
    )!
    expect(mixed.coordinates.map(({ value }) => value)).toEqual([2e-6])

    const zeros = layoutTimeSeries([{ timestamp: '2026-11-05T00:00:00Z', value: 0 }], {
      scale: 'log',
    })!
    expect(zeros.scale).toBe('linear')
  })

  test('lays the chart out for a phone without leaving the frame', () => {
    const layout = layoutTimeSeries(
      day((index) => index),
      { width: 320 },
    )!

    expect(layout.frame.width).toBe(320)
    expect(layout.timeTicks).toHaveLength(3)
    expect(layout.coordinates.at(-1)!.x).toBe(320 - layout.frame.right)
    expect(Math.min(...layout.coordinates.map(({ x }) => x))).toBe(layout.frame.left)
  })

  test('spans whole decades on a log axis', () => {
    expect(logDecades(2.1e-7, 3.35e-5)).toEqual({ low: -7, high: -4 })
    expect(logDecades(1e-6, 1e-6)).toEqual({ low: -6, high: -5 })
    expect(logDecades(3e-7, 4e-7, 2)).toEqual({ low: -7, high: -5 })
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
