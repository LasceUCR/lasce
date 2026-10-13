import path from 'node:path'

import { Resvg } from '@resvg/resvg-js'

import {
  DYNAMIC_SPECTRUM_CHART,
  layoutDynamicSpectrum,
} from '@/app/lib/charts/dynamicSpectrumLayout'
import { layoutTimeSeries, TIME_SERIES_CHART } from '@/app/lib/charts/timeSeriesLayout'
import type {
  DynamicSpectrumDataResult,
  ScientificDataResult,
  TimeSeriesDataResult,
} from '@/app/lib/scientific-data'

import { UnexportableResultError, type Exporter } from './types'

/*
 * Chart images are drawn on the server from the same layout the page uses
 * (`app/lib/charts/*Layout.ts`), then rasterized by resvg. The page's SVG cannot be reused as is:
 * it is styled by classes and CSS variables in `globals.css`, which a standalone SVG does not
 * have, so the colours below are those variables resolved.
 */

const COLORS = {
  background: '#ffffff',
  title: '#023047', // --deep-space-blue-2
  text: '#536a7c', // --muted
  grid: '#d6e1e8', // --border
  line: '#087fbd', // --bright-teal-blue
  pointFill: '#ffffff', // --white
  pointStroke: '#023047', // --blue-dark
  spectrumLow: '#eef4f7', // --alice-blue
  spectrumHigh: '#023047', // --blue-dark
}

const FONT_FAMILY = 'Geist'
const FONT_FILE = path.join(process.cwd(), 'app/services/downloads/fonts/Geist-Regular.ttf')
const HEADER_HEIGHT = 72
const FOOTER_HEIGHT = 48
const LEGEND_HEIGHT = 30
const PNG_SCALE = 2

const numberFormatter = new Intl.NumberFormat('es-CR', {
  maximumSignificantDigits: 4,
  notation: 'scientific',
})

function formatValue(value: number) {
  return numberFormatter.format(value)
}

function formatTime(timestamp: string) {
  return timestamp.slice(11, 16)
}

export function escapeXml(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function hexChannels(hex: string) {
  return [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16))
}

/** The spectrum fill `color-mix(in srgb, high t, low)` resolves to. */
export function mixColor(low: string, high: string, t: number) {
  const [lowChannels, highChannels] = [hexChannels(low), hexChannels(high)]
  return `#${lowChannels
    .map((channel, index) => Math.round(highChannels[index]! * t + channel * (1 - t)))
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')}`
}

function text(
  content: string,
  x: number,
  y: number,
  { anchor = 'start', size = 12, fill = COLORS.text } = {},
) {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" fill="${fill}">${escapeXml(content)}</text>`
}

function header(result: ScientificDataResult, width: number) {
  const { query, instrument, product, parameter } = result
  const title = product.name.includes(`(${product.code})`)
    ? product.name
    : `${product.name} (${product.code})`
  const subtitle = [
    `${query.source} · ${instrument.code}`,
    parameter.label,
    `${query.date}, ${query.startTime}–${query.endTime} UTC`,
  ].join('  ·  ')
  return [
    `<rect width="${width}" height="${HEADER_HEIGHT}" fill="${COLORS.background}"/>`,
    text(title, 24, 32, { size: 18, fill: COLORS.title }),
    text(subtitle, 24, 54),
  ].join('')
}

function footer(result: ScientificDataResult, width: number, top: number) {
  const { origin, parameter } = result
  const provider = `Fuente: ${origin.provider}${origin.kind === 'simulated' ? ' (datos simulados)' : ''}`
  return [
    text(`${provider}. Unidad: ${parameter.unit}.`, 24, top + 22, { size: 11 }),
    text('LASCE — Universidad de Costa Rica', width - 24, top + 40, { anchor: 'end', size: 11 }),
  ].join('')
}

function document(width: number, height: number, content: string) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
    `viewBox="0 0 ${width} ${height}" font-family="${FONT_FAMILY}">` +
    `<rect width="${width}" height="${height}" fill="${COLORS.background}"/>${content}</svg>`
  )
}

export function renderTimeSeriesSvg(result: TimeSeriesDataResult): string {
  const layout = layoutTimeSeries(result.points)
  if (!layout) throw new UnexportableResultError('png', 'empty time-series')

  const chart = TIME_SERIES_CHART
  const plotBottom = chart.height - chart.bottom
  const plot = [
    ...layout.gridLines.map(
      ({ y, value }) =>
        `<line x1="${chart.left}" x2="${chart.width - chart.right}" y1="${y}" y2="${y}" stroke="${COLORS.grid}" stroke-width="1"/>` +
        text(formatValue(value), chart.left - 12, y + 4, { anchor: 'end' }),
    ),
    `<line x1="${chart.left}" x2="${chart.left}" y1="${chart.top}" y2="${plotBottom}" stroke="${COLORS.text}" stroke-width="1"/>`,
    `<line x1="${chart.left}" x2="${chart.width - chart.right}" y1="${plotBottom}" y2="${plotBottom}" stroke="${COLORS.text}" stroke-width="1"/>`,
    `<polyline points="${layout.path}" fill="none" stroke="${COLORS.line}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
    ...layout.coordinates.map(
      ({ x, y }) =>
        `<circle cx="${x}" cy="${y}" r="${layout.pointRadius}" fill="${COLORS.pointFill}" stroke="${COLORS.pointStroke}" stroke-width="1.5"/>`,
    ),
    text(formatTime(layout.firstTimestamp), chart.left, chart.height - 20),
    text(formatTime(layout.middleTimestamp), chart.left + layout.plotWidth / 2, chart.height - 20, {
      anchor: 'middle',
    }),
    text(`${formatTime(layout.lastTimestamp)} UTC`, chart.width - chart.right, chart.height - 20, {
      anchor: 'end',
    }),
  ].join('')

  const height = HEADER_HEIGHT + chart.height + FOOTER_HEIGHT
  return document(
    chart.width,
    height,
    header(result, chart.width) +
      `<g transform="translate(0 ${HEADER_HEIGHT})">${plot}</g>` +
      footer(result, chart.width, HEADER_HEIGHT + chart.height),
  )
}

export function renderDynamicSpectrumSvg(result: DynamicSpectrumDataResult): string {
  const layout = layoutDynamicSpectrum(result)
  if (!layout) throw new UnexportableResultError('png', 'empty dynamic-spectrum')

  const chart = DYNAMIC_SPECTRUM_CHART
  const plotBottom = chart.height - chart.bottom
  const unit = result.frequencyUnit
  const plot = [
    ...layout.rects.map(
      ({ x, y, width, height, intensity }) =>
        `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${mixColor(COLORS.spectrumLow, COLORS.spectrumHigh, intensity)}"/>`,
    ),
    `<line x1="${chart.left}" x2="${chart.left}" y1="${chart.top}" y2="${plotBottom}" stroke="${COLORS.text}" stroke-width="1"/>`,
    `<line x1="${chart.left}" x2="${chart.width - chart.right}" y1="${plotBottom}" y2="${plotBottom}" stroke="${COLORS.text}" stroke-width="1"/>`,
    text(`${layout.lowestFrequency} ${unit}`, chart.left - 10, plotBottom + 4, { anchor: 'end' }),
    text(`${layout.highestFrequency} ${unit}`, chart.left - 10, chart.top + 4, { anchor: 'end' }),
    text(formatTime(layout.firstTimestamp), chart.left, chart.height - 20),
    text(formatTime(layout.middleTimestamp), chart.left + layout.plotWidth / 2, chart.height - 20, {
      anchor: 'middle',
    }),
    text(`${formatTime(layout.lastTimestamp)} UTC`, chart.width - chart.right, chart.height - 20, {
      anchor: 'end',
    }),
  ].join('')

  const legendTop = HEADER_HEIGHT + chart.height
  const legend = [
    `<defs><linearGradient id="intensity"><stop offset="0" stop-color="${COLORS.spectrumLow}"/><stop offset="1" stop-color="${COLORS.spectrumHigh}"/></linearGradient></defs>`,
    text('Baja', chart.left, legendTop + 16),
    `<rect x="${chart.left + 40}" y="${legendTop + 6}" width="200" height="12" fill="url(#intensity)" stroke="${COLORS.grid}"/>`,
    text('Alta', chart.left + 250, legendTop + 16),
  ].join('')

  const height = HEADER_HEIGHT + chart.height + LEGEND_HEIGHT + FOOTER_HEIGHT
  return document(
    chart.width,
    height,
    header(result, chart.width) +
      `<g transform="translate(0 ${HEADER_HEIGHT})">${plot}</g>` +
      legend +
      footer(result, chart.width, legendTop + LEGEND_HEIGHT),
  )
}

export function renderResultSvg(result: ScientificDataResult): string {
  switch (result.visualization) {
    case 'time-series':
      return renderTimeSeriesSvg(result)
    case 'dynamic-spectrum':
      return renderDynamicSpectrumSvg(result)
    default:
      throw new UnexportableResultError('png', result.visualization)
  }
}

export function rasterizeSvg(svg: string): Buffer {
  const resvg = new Resvg(svg, {
    background: COLORS.background,
    fitTo: { mode: 'zoom', value: PNG_SCALE },
    font: { fontFiles: [FONT_FILE], loadSystemFonts: false, defaultFontFamily: FONT_FAMILY },
  })
  return resvg.render().asPng()
}

export const pngExporter: Exporter = {
  format: 'png',
  async export(result) {
    return { body: rasterizeSvg(renderResultSvg(result)), rowCount: null }
  },
}
