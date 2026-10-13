import { describe, expect, test } from 'vitest'

import type { ScientificDataResult, TimeSeriesDataResult } from '@/app/lib/scientific-data'
import {
  csvExporter,
  escapeCsvCell,
  resultToCsv,
  toCsv,
} from '@/app/services/downloads/exporters/csv'
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
  parameter: { code: '0.1-0.8nm', label: 'Banda larga (0,1–0,8 nm)', unit: 'W/m²' },
  origin: {
    kind: 'observed',
    provider: 'CITIC-UCR — lecturas EXIS',
    notice: 'Sin muestreo.\nTodas las observaciones.',
    satellite: 19,
  },
  visualization: 'time-series',
  points: [
    { timestamp: '2026-09-27T08:00:00.377Z', value: 5.9e-7 },
    { timestamp: '2026-09-27T08:00:01.377Z', value: 6.1e-7 },
  ],
}

const generatedAt = new Date('2026-09-28T00:00:00Z')

describe('escapeCsvCell', () => {
  test('leaves plain cells alone and quotes the ones RFC 4180 requires', () => {
    expect(escapeCsvCell('0.1-0.8nm')).toBe('0.1-0.8nm')
    expect(escapeCsvCell(5.9e-7)).toBe('5.9e-7')
    expect(escapeCsvCell('a,b')).toBe('"a,b"')
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""')
    expect(escapeCsvCell('two\nlines')).toBe('"two\nlines"')
    expect(escapeCsvCell(' padded')).toBe('" padded"')
  })
})

describe('toCsv', () => {
  test('writes a BOM, metadata comments, a header and rows with CRLF endings', () => {
    const text = toCsv({
      metadata: [['Nota', 'una\r\nnota']],
      columns: ['a', 'b'],
      rows: [[1, 'x,y']],
    })

    expect(text).toBe('\uFEFF# Nota: una nota\r\na,b\r\n1,"x,y"\r\n')
  })
})

describe('resultToCsv', () => {
  test('exports every point of a time series with its provenance', () => {
    const { text, rowCount } = resultToCsv(series, generatedAt)
    const lines = text.replace('\uFEFF', '').split('\r\n')

    expect(rowCount).toBe(2)
    expect(lines).toContain('# Fuente: GOES')
    expect(lines).toContain('# Instrumento: EXIS — Sensores EXIS')
    expect(lines).toContain('# Unidad: W/m²')
    expect(lines).toContain('# Satélite: GOES-19')
    expect(lines).toContain('# Intervalo (UTC): 08:00–09:00')
    expect(lines).toContain('# Tipo de datos: observados')
    expect(lines).toContain('# Nota: Sin muestreo. Todas las observaciones.')
    expect(lines).toContain('# Generado (UTC): 2026-09-28T00:00:00.000Z')
    expect(lines.slice(-4)).toEqual([
      'timestamp_utc,value',
      '2026-09-27T08:00:00.377Z,5.9e-7',
      '2026-09-27T08:00:01.377Z,6.1e-7',
      '',
    ])
  })

  test('exports a dynamic spectrum one cell per row', async () => {
    const spectrum = await queryMockScientificData({
      source: 'ROSAC',
      product: 'ROSAC-I2',
      parameter: 'simulated-spectrum',
      date: '2026-09-27',
      startTime: '08:00',
      endTime: '08:10',
    })

    const { text, rowCount } = resultToCsv(spectrum, generatedAt)

    expect(rowCount).toBe(20)
    expect(text).toContain('\r\ntimestamp_utc,frequency_mhz,value\r\n2026-09-27T08:00:00Z,100,')
    expect(text).toContain('# Tipo de datos: simulados')
    expect(text).not.toContain('Satélite')
  })

  test('refuses an image sequence', () => {
    const images = {
      ...series,
      visualization: 'image-sequence',
      images: [],
    } as unknown as ScientificDataResult

    expect(() => resultToCsv(images)).toThrow(UnexportableResultError)
  })
})

describe('csvExporter', () => {
  test('returns UTF-8 bytes and the row count', async () => {
    const file = await csvExporter.export(series)

    expect(file.rowCount).toBe(2)
    expect(file.body.toString('utf8')).toContain('W/m²')
  })
})
