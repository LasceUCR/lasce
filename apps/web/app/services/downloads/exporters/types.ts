import type { DownloadFormat } from '@/app/lib/downloads/formats'
import type { ScientificDataResult } from '@/app/lib/scientific-data'

export interface ExportedFile {
  body: Buffer
  /** Data rows written; null for formats that are not row-based (images). */
  rowCount: number | null
}

/** Turns a query result into the bytes of one file format. One per entry in `DOWNLOAD_FORMATS`. */
export interface Exporter {
  readonly format: DownloadFormat
  export(result: ScientificDataResult): Promise<ExportedFile>
}

/** The result has no shape this format can represent, e.g. a SUVI image sequence as CSV. */
export class UnexportableResultError extends Error {
  constructor(format: DownloadFormat, visualization: string) {
    super(`A ${visualization} result cannot be exported as ${format}`)
    this.name = 'UnexportableResultError'
  }
}
