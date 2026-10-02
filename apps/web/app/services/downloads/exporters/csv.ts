import type { ScientificDataResult } from '@/app/lib/scientific-data'

import { UnexportableResultError, type Exporter } from './types'

type Cell = string | number

export interface CsvDocument {
  /** Written first as `# key: value` lines, the convention NOAA's own CSV products use. */
  metadata: [string, string][]
  columns: string[]
  rows: Cell[][]
}

/** RFC 4180 quoting: only when the cell needs it, doubling embedded quotes. */
export function escapeCsvCell(cell: Cell): string {
  const text = String(cell)
  return /[",\r\n]/.test(text) || text !== text.trim() ? `"${text.replaceAll('"', '""')}"` : text
}

/**
 * CRLF line endings (RFC 4180) and a UTF-8 BOM, so spreadsheet software opens units such as
 * `W/m²` correctly instead of guessing a legacy encoding.
 */
export function toCsv({ metadata, columns, rows }: CsvDocument): string {
  const lines = [
    ...metadata.map(([key, value]) => `# ${key}: ${value.replace(/\s*[\r\n]+\s*/g, ' ')}`),
    columns.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ]
  return `\uFEFF${lines.join('\r\n')}\r\n`
}

function describe(result: ScientificDataResult, generatedAt: Date): [string, string][] {
  const { query, instrument, product, parameter, origin } = result
  return [
    ['Fuente', query.source],
    ['Instrumento', `${instrument.code} — ${instrument.name}`],
    ['Producto', `${product.code} — ${product.name}`],
    ['Canal', `${parameter.code} — ${parameter.label}`],
    ['Unidad', parameter.unit],
    ...(origin.satellite ? [['Satélite', `GOES-${origin.satellite}`] as [string, string]] : []),
    ['Fecha', query.date],
    ['Intervalo (UTC)', `${query.startTime}–${query.endTime}`],
    ['Tipo de datos', origin.kind === 'observed' ? 'observados' : 'simulados'],
    ['Proveedor', origin.provider],
    ['Nota', origin.notice],
    ['Generado (UTC)', generatedAt.toISOString()],
    ['Generado por', 'LASCE — Universidad de Costa Rica'],
  ]
}

export function resultToCsv(result: ScientificDataResult, generatedAt = new Date()) {
  const metadata = describe(result, generatedAt)

  switch (result.visualization) {
    case 'time-series':
      return {
        text: toCsv({
          metadata,
          columns: ['timestamp_utc', 'value'],
          rows: result.points.map(({ timestamp, value }) => [timestamp, value]),
        }),
        rowCount: result.points.length,
      }
    case 'dynamic-spectrum':
      return {
        text: toCsv({
          metadata,
          columns: ['timestamp_utc', `frequency_${result.frequencyUnit.toLowerCase()}`, 'value'],
          rows: result.cells.map(({ timestamp, frequency, value }) => [
            timestamp,
            frequency,
            value,
          ]),
        }),
        rowCount: result.cells.length,
      }
    default:
      throw new UnexportableResultError('csv', result.visualization)
  }
}

export const csvExporter: Exporter = {
  format: 'csv',
  async export(result) {
    const { text, rowCount } = resultToCsv(result)
    return { body: Buffer.from(text, 'utf8'), rowCount }
  },
}
