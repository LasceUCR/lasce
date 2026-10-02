/**
 * The file formats `/datos` can produce. Adding one (say `json`) means an entry here, an exporter
 * in `app/services/downloads/exporters/`, and the policy rows in `./policy.ts` that allow it.
 * Client-safe: no server imports.
 */
export const DOWNLOAD_FORMATS = ['png', 'csv'] as const

export type DownloadFormat = (typeof DOWNLOAD_FORMATS)[number]

export interface DownloadFormatDefinition {
  /** Button text on `/datos`. */
  label: string
  /**
   * `graphic` formats are advertised to anonymous visitors as a sign-in prompt; `data` formats
   * are shown only to users who may download them.
   */
  kind: 'graphic' | 'data'
  extension: string
  contentType: string
}

export const DOWNLOAD_FORMAT_DEFINITIONS: Record<DownloadFormat, DownloadFormatDefinition> = {
  png: {
    label: 'Descargar gráfica (PNG)',
    kind: 'graphic',
    extension: 'png',
    contentType: 'image/png',
  },
  csv: {
    label: 'Descargar datos (CSV)',
    kind: 'data',
    extension: 'csv',
    contentType: 'text/csv; charset=utf-8',
  },
}

/** How long a presigned download link works. */
export const DOWNLOAD_LINK_TTL_SECONDS = 30 * 60

export function isDownloadFormat(value: unknown): value is DownloadFormat {
  return typeof value === 'string' && (DOWNLOAD_FORMATS as readonly string[]).includes(value)
}
