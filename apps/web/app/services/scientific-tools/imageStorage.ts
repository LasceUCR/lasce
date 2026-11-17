import {
  SCIENTIFIC_TOOL_IMAGE_FILENAME,
  SCIENTIFIC_TOOL_IMAGE_MAX_BYTES,
} from '@/app/lib/scientific-tool-image'
import { createImageStore } from '@/app/services/cms-images/imageStorage'

const images = createImageStore({
  prefix: 'assets/scientific-tools/',
  publicPath: '/api/scientific-tools/images',
  filename: SCIENTIFIC_TOOL_IMAGE_FILENAME,
  maxBytes: SCIENTIFIC_TOOL_IMAGE_MAX_BYTES,
  label: 'scientific tool image',
})

/** Stores a validated card image and returns the path that serves it. */
export const storeScientificToolImage = images.store

/** Reads a stored card image; only generated filenames are accepted. */
export const readScientificToolImage = images.read
