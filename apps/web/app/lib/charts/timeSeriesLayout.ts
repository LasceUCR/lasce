import type { ScientificDataPoint } from '@/app/lib/scientific-data'

import { FLARE_CLASSES, flareClass, hasFlareClasses, type FlareClass } from './flareClass'

/**
 * Geometry of the `/datos` time-series chart, shared by the on-screen SVG
 * (`ScientificDataChart`) and the downloadable PNG (`app/services/downloads/exporters/png.ts`)
 * so the image a user downloads is the chart they saw. The page lays the chart out for the width
 * of its container; the PNG uses the default width.
 */
export const TIME_SERIES_CHART = {
  height: 320,
  width: 760,
  top: 28,
  right: 28,
  bottom: 54,
  left: 74,
} as const

/** Below this width the chart is laid out for a phone: shorter, with fewer time labels. */
const NARROW_WIDTH = 480
/** Room on the right for the flare class letters. */
const FLARE_CLASS_MARGIN = 40
const NARROW_FLARE_CLASS_MARGIN = 30
const NARROW_LEFT = 62

export type TimeSeriesScale = 'linear' | 'log'

/** How a product's readings are drawn. */
export interface TimeSeriesStyle {
  scale: TimeSeriesScale
  /** Mark the A–X flare classes and name the maximum's class (0.1–0.8 nm X-ray flux only). */
  flareClasses: boolean
}

/*
 * Fluxes that span several decades in a day are drawn on a log scale, as NOAA does: both X-ray
 * bands and the SEISS particle fluxes. Series that move a few percent around a level (EUV lines,
 * the Mg II index, the magnetic field, whose components are legitimately negative) stay linear.
 */
const LOG_SCALE_PRODUCTS = new Set(['SFXR', 'EHIS', 'MPSH', 'SGPS'])

export function timeSeriesStyle(product: string, parameter: string): TimeSeriesStyle {
  return {
    scale: LOG_SCALE_PRODUCTS.has(product) ? 'log' : 'linear',
    flareClasses: hasFlareClasses(product, parameter),
  }
}

export interface TimeSeriesFrame {
  width: number
  height: number
  top: number
  right: number
  bottom: number
  left: number
}

export interface TimeSeriesCoordinate extends ScientificDataPoint {
  x: number
  y: number
}

export interface TimeSeriesLayout {
  frame: TimeSeriesFrame
  /** The scale actually used: a log request falls back to linear when no value is positive. */
  scale: TimeSeriesScale
  minimum: number
  maximum: number
  plotWidth: number
  plotHeight: number
  /** The points drawn, in time order. A log scale cannot draw zero or negative values. */
  coordinates: TimeSeriesCoordinate[]
  /** `points` attribute of the series polyline. */
  path: string
  /** Horizontal grid lines at round values (each decade on a log scale), bottom to top. */
  gridLines: { y: number; value: number }[]
  /** Time labels along the bottom; the first and the last are always included. */
  timeTicks: { x: number; timestamp: string; anchor: 'start' | 'middle' | 'end' }[]
  firstTimestamp: string
  lastTimestamp: string
  pointRadius: number
  /** The highest point drawn. */
  peak: TimeSeriesCoordinate
  /** Flare class letters, centred in their decade, when the style asks for them. */
  flareBands: { letter: string; y: number }[]
  /** The class of the highest point, when the style asks for flare classes. */
  peakClass: FlareClass | null
}

export interface TimeSeriesLayoutOptions extends Partial<TimeSeriesStyle> {
  /** The width to lay the chart out for, in CSS pixels; the default suits the PNG. */
  width?: number
}

/** Cleans floating-point noise from a tick (0.30000000000000004 → 0.3). */
function clean(value: number) {
  return Number(value.toPrecision(12))
}

/** A step of 1, 2 or 5 × 10ⁿ that cuts `range` into at most `count` parts. */
function niceStep(range: number, count: number) {
  const rough = range / count
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const normalized = rough / magnitude
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return factor * magnitude
}

/**
 * Round ticks that enclose `minimum`–`maximum`. The axis is not padded past them, so it never
 * reaches below zero for data that has no negative values, and it does not start at zero either,
 * which would flatten a series that varies a few percent around its level.
 */
export function linearTicks(minimum: number, maximum: number, count = 5) {
  const range = maximum - minimum || Math.abs(maximum) * 0.1 || 1
  const step = niceStep(range, count)
  let low = Math.floor(clean(minimum / step)) * step
  let high = Math.ceil(clean(maximum / step)) * step
  if (low === high) {
    high += step
    if (minimum < 0 || low - step >= 0) low -= step
  }
  const ticks: number[] = []
  for (let index = 0; low + index * step <= high + step / 2; index += 1) {
    ticks.push(clean(low + index * step))
  }
  return ticks
}

function decade(exponent: number) {
  return Number(`1e${exponent}`)
}

/** Exponents of the decades that enclose `minimum`–`maximum` (both positive), at least `span`. */
export function logDecades(minimum: number, maximum: number, span = 1) {
  const low = Math.floor(clean(Math.log10(minimum)))
  const high = Math.ceil(clean(Math.log10(maximum)))
  return { low, high: Math.max(high, low + span) }
}

/** As many time labels as fit: about 90 px each, never fewer than the first and the last. */
function timeTickCount(plotWidth: number) {
  return plotWidth >= 360 ? 5 : plotWidth >= 200 ? 3 : 2
}

/** Lays out a non-empty series; `null` when there is nothing to draw. */
export function layoutTimeSeries(
  points: ScientificDataPoint[],
  options: TimeSeriesLayoutOptions = {},
): TimeSeriesLayout | null {
  const positive = points.filter((point) => point.value > 0)
  const scale: TimeSeriesScale = options.scale === 'log' && positive.length ? 'log' : 'linear'
  const drawn = scale === 'log' ? positive : points
  if (!drawn.length) return null

  const width = options.width ?? TIME_SERIES_CHART.width
  const flareClasses = Boolean(options.flareClasses) && scale === 'log'
  const narrow = width < NARROW_WIDTH
  const frame: TimeSeriesFrame = {
    ...TIME_SERIES_CHART,
    width,
    height: narrow ? 280 : TIME_SERIES_CHART.height,
    left: narrow ? NARROW_LEFT : TIME_SERIES_CHART.left,
    right: flareClasses
      ? narrow
        ? NARROW_FLARE_CLASS_MARGIN
        : FLARE_CLASS_MARGIN
      : TIME_SERIES_CHART.right,
  }
  const plotWidth = frame.width - frame.left - frame.right
  const plotHeight = frame.height - frame.top - frame.bottom
  const plotBottom = frame.top + plotHeight

  let minimum = drawn[0]!.value
  let maximum = drawn[0]!.value
  for (const { value } of drawn) {
    if (value < minimum) minimum = value
    if (value > maximum) maximum = value
  }

  // A flare chart spans at least two classes, so a quiet day still shows where the next one starts.
  const decades = scale === 'log' ? logDecades(minimum, maximum, flareClasses ? 2 : 1) : null
  let gridValues: number[]
  let toY: (value: number) => number
  if (decades) {
    const { low, high } = decades
    const span = high - low
    const every = span > 8 ? 2 : 1
    gridValues = []
    // `Number('1e-5')` is exactly the decimal 1e-5; `10 ** -5` is 0.000009999999999999999.
    for (let exponent = low; exponent <= high; exponent += every) gridValues.push(decade(exponent))
    toY = (value) => plotBottom - ((Math.log10(value) - low) / span) * plotHeight
  } else {
    gridValues = linearTicks(minimum, maximum, narrow ? 4 : 5)
    const low = gridValues[0]!
    const span = gridValues.at(-1)! - low
    toY = (value) => plotBottom - ((value - low) / span) * plotHeight
  }

  const firstInstant = Date.parse(drawn[0]!.timestamp)
  const lastInstant = Date.parse(drawn.at(-1)!.timestamp)
  const duration = lastInstant - firstInstant
  const toX = (instant: number) =>
    frame.left +
    (duration === 0 ? plotWidth / 2 : ((instant - firstInstant) / duration) * plotWidth)
  const coordinates = drawn.map((point) => ({
    ...point,
    x: toX(Date.parse(point.timestamp)),
    y: toY(point.value),
  }))
  const peak = coordinates.reduce((highest, point) =>
    point.value > highest.value ? point : highest,
  )

  const tickCount = duration === 0 ? 1 : timeTickCount(plotWidth)
  const timeTicks = Array.from({ length: tickCount }, (_, index) => {
    const ratio = tickCount === 1 ? 0.5 : index / (tickCount - 1)
    const instant = firstInstant + duration * ratio
    const anchor: 'start' | 'middle' | 'end' =
      tickCount === 1
        ? 'middle'
        : index === 0
          ? 'start'
          : index === tickCount - 1
            ? 'end'
            : 'middle'
    return { x: toX(instant), timestamp: new Date(instant).toISOString(), anchor }
  })

  const flareBands =
    flareClasses && decades
      ? FLARE_CLASSES.filter(
          ({ exponent }) => exponent >= decades.low && exponent < decades.high,
        ).map(({ letter, exponent }) => ({ letter, y: toY(decade(exponent) * Math.sqrt(10)) }))
      : []

  return {
    frame,
    scale,
    minimum,
    maximum,
    plotWidth,
    plotHeight,
    coordinates,
    path: coordinates.map(({ x, y }) => `${x},${y}`).join(' '),
    gridLines: gridValues.map((value) => ({ y: toY(value), value })),
    timeTicks,
    firstTimestamp: drawn[0]!.timestamp,
    lastTimestamp: drawn.at(-1)!.timestamp,
    pointRadius: drawn.length > 60 ? 1.5 : 3,
    peak,
    flareBands,
    peakClass: flareClasses ? flareClass(peak.value) : null,
  }
}
