import type { ScientificDataResult } from '@/app/lib/scientific-data'
import { describeOrigin, localizeResultNames } from '@/app/lib/scientific-data-copy'

import { exportCopy, type ExportCopy } from './copy'
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

function describe(
  result: ScientificDataResult,
  copy: ExportCopy,
  generatedAt: Date,
): [string, string][] {
  const { query, instrument, product, parameter, origin } = localizeResultNames(
    result,
    copy.sources,
  )
  const { provider, notice } = describeOrigin(origin, copy.origins)
  const t = copy.files
  return [
    [t('source'), query.source],
    [t('instrument'), `${instrument.code} — ${instrument.name}`],
    [t('product'), `${product.code} — ${product.name}`],
    [t('channel'), `${parameter.code} — ${parameter.label}`],
    [t('unit'), parameter.unit],
    ...(origin.satellite ? [[t('satellite'), `GOES-${origin.satellite}`] as [string, string]] : []),
    [t('date'), query.date],
    [t('interval'), `${query.startTime}–${query.endTime}`],
    [t('dataKind'), t(origin.kind)],
    [t('provider'), provider],
    [t('notice'), notice],
    [t('generatedAt'), generatedAt.toISOString()],
    [t('generatedBy'), 'LASCE — Universidad de Costa Rica'],
  ]
}

export function resultToCsv(
  result: ScientificDataResult,
  generatedAt = new Date(),
  copy: ExportCopy = exportCopy(),
) {
  const metadata = describe(result, copy, generatedAt)

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
  async export(result, copy) {
    const { text, rowCount } = resultToCsv(result, new Date(), copy)
    return { body: Buffer.from(text, 'utf8'), rowCount }
  },
}
