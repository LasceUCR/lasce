/**
 * 25 MiB — generous for a CSV export or a handful of images, small enough
 * that MinIO actually enforcing it (see `IAssetStorage.createUpload` below)
 * matters.
 */
export const MAX_ASSET_BYTES = 25 * 1024 * 1024

/** Images, PDFs and CSVs — everything an upload UI following this service is expected to accept. */
export const ALLOWED_ASSET_CONTENT_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/csv',
] as const

export type AllowedAssetContentType = (typeof ALLOWED_ASSET_CONTENT_TYPES)[number]


// Default validity for createDownloadUrl — generous enough for a browser
// tab left open, without leaving a link usable indefinitely.
export const DOWNLOAD_EXPIRY_SECONDS = 60 * 60
