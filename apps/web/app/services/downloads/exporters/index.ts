import type { DownloadFormat } from '@/app/lib/downloads/formats'

import { csvExporter } from './csv'
import { pngExporter } from './png'
import type { Exporter } from './types'

/**
 * One exporter per format. Typed as a full `Record`, so adding a format to `DOWNLOAD_FORMATS`
 * fails the typecheck until its exporter is registered here.
 */
export const EXPORTERS: Record<DownloadFormat, Exporter> = {
  png: pngExporter,
  csv: csvExporter,
}

export { UnexportableResultError, type ExportedFile, type Exporter } from './types'
