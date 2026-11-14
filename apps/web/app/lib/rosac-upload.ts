export const ROSAC_IMAGE_ALLOWED_CONTENT_TYPES = [
  'image/avif',
  'image/svg+xml',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const
export const ROSAC_IMAGE_ACCEPT = ROSAC_IMAGE_ALLOWED_CONTENT_TYPES.join(',')
export const ROSAC_IMAGE_MAX_BYTES = 10_000_000

export const ROSAC_IMAGE_UPLOAD_VALIDATION = {
  allowedContentTypes: ROSAC_IMAGE_ALLOWED_CONTENT_TYPES,
  maxSizeBytes: ROSAC_IMAGE_MAX_BYTES,
} as const
