import { existsSync } from 'node:fs'
import path from 'node:path'

import { afterEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ options: vi.fn(), svg: vi.fn() }))

vi.mock('@resvg/resvg-js', () => ({
  Resvg: class {
    constructor(svg: string, options: unknown) {
      mocks.svg(svg)
      mocks.options(options)
    }
    render() {
      return { asPng: () => Buffer.from('png-bytes') }
    }
  },
}))

import type {
  DynamicSpectrumDataResult,
  ScientificDataResult,
  TimeSeriesDataResult,
} from '@/app/lib/scientific-data'
import {
  escapeXml,
  mixColor,
  pngExporter,
  renderDynamicSpectrumSvg,
  renderResultSvg,
  renderTimeSeriesSvg,
} from '@/app/services/downloads/exporters/png'
import { UnexportableResultError } from '@/app/services/downloads/exporters/types'
import { queryMockScientificData } from '@/app/services/scientific-data/mockScientificDataSource'

const series: TimeSeriesDataResult = {
  query: {
    source: 'GOES',
    product: 'SFXR',
    parameter: '0.1-0.8nm',
    date: '2026-09-27',
    startTime: '08:00',
    endTime: '09:00',
  },
  instrument: { code: 'EXIS', name: 'Sensores EXIS' },
  product: { code: 'SFXR', name: 'Flujo solar: rayos X' },
  parameter: { code: '0.1-0.8nm', label: 'Banda larga <0,1–0,8 nm>', unit: 'W/m²' },
  origin: { kind: 'observed', provider: 'CITIC-UCR & NOAA', notice: '', satellite: 19 },
  visualization: 'time-series',
  points: [
    { timestamp: '2026-09-27T08:00:00Z', value: 1e-7 },
    { timestamp: '2026-09-27T09:00:00Z', value: 3e-7 },
  ],
}

async function rosacSpectrum() {
  const result = await queryMockScientificData({
    source: 'ROSAC',
    product: 'ROSAC-I2',
    parameter: 'simulated-spectrum',
    date: '2026-09-27',
    startTime: '08:00',
    endTime: '08:10',
  })
  return result as DynamicSpectrumDataResult
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('renderTimeSeriesSvg', () => {
  test('draws a standalone chart with its title, range, unit and source', () => {
    const svg = renderTimeSeriesSvg(series)

    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/)
    expect(svg).toContain('Flujo solar: rayos X (SFXR)')
    expect(svg).toContain('2026-09-27, 08:00–09:00 UTC')
    expect(svg).toContain('Unidad: W/m²')
    expect(svg).toContain('<polyline')
    expect(svg.match(/<circle/g)).toHaveLength(2)
    expect(svg).not.toContain('var(--')
  })

  test('escapes text taken from the result', () => {
    const svg = renderTimeSeriesSvg(series)

    expect(svg).toContain('Banda larga &lt;0,1–0,8 nm&gt;')
    expect(svg).toContain('CITIC-UCR &amp; NOAA')
  })

  test('labels simulated data as such', async () => {
    const rosac = await queryMockScientificData({
      source: 'ROSAC',
      product: 'ROSAC-I1',
      parameter: 'simulated-intensity',
      date: '2026-09-27',
      startTime: '08:00',
      endTime: '09:00',
    })

    expect(renderResultSvg(rosac)).toContain('(datos simulados)')
  })

  test('refuses an empty series', () => {
    expect(() => renderTimeSeriesSvg({ ...series, points: [] })).toThrow(UnexportableResultError)
  })
})

describe('renderDynamicSpectrumSvg', () => {
  test('fills each cell with a resolved colour and draws the intensity legend', async () => {
    const spectrum = await rosacSpectrum()

    const svg = renderResultSvg(spectrum)

    // One rect per cell, plus the background, the header band and the legend bar.
    expect(svg.match(/<rect /g)).toHaveLength(spectrum.cells.length + 3)
    expect(svg).toContain('1000 MHz')
    expect(svg).toContain('Baja')
    expect(svg).toContain('Alta')
    expect(svg).not.toContain('color-mix')
  })

  test('refuses an empty spectrum', async () => {
    const spectrum = await rosacSpectrum()

    expect(() => renderDynamicSpectrumSvg({ ...spectrum, cells: [] })).toThrow(
      UnexportableResultError,
    )
  })
})

describe('renderResultSvg', () => {
  test('refuses SUVI image sequences', () => {
    const images = { ...series, visualization: 'image-sequence', images: [] }

    expect(() => renderResultSvg(images as unknown as ScientificDataResult)).toThrow(
      UnexportableResultError,
    )
  })
})

describe('mixColor', () => {
  test('interpolates between two colours', () => {
    expect(mixColor('#000000', '#ffffff', 0)).toBe('#000000')
    expect(mixColor('#000000', '#ffffff', 1)).toBe('#ffffff')
    expect(mixColor('#000000', '#ffffff', 0.5)).toBe('#808080')
  })
})

describe('escapeXml', () => {
  test('escapes every XML special character', () => {
    expect(escapeXml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&apos;&amp;&apos;&lt;/a&gt;',
    )
  })
})

describe('pngExporter', () => {
  test('bundles the font it draws with', () => {
    const font = path.join(process.cwd(), 'app/services/downloads/fonts/Geist-Regular.ttf')

    expect(existsSync(font)).toBe(true)
  })

  test('rasterizes at twice the size with the bundled font only', async () => {
    const file = await pngExporter.export(series)

    expect(file).toEqual({ body: Buffer.from('png-bytes'), rowCount: null })
    expect(mocks.svg).toHaveBeenCalledWith(renderTimeSeriesSvg(series))
    expect(mocks.options).toHaveBeenCalledWith(
      expect.objectContaining({
        fitTo: { mode: 'zoom', value: 2 },
        font: expect.objectContaining({
          loadSystemFonts: false,
          defaultFontFamily: 'Geist',
          fontFiles: [expect.stringMatching(/Geist-Regular\.ttf$/)],
        }),
      }),
    )
  })
})
