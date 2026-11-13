import { INITIATIVE_LOGO_FILENAME, INITIATIVE_LOGO_MAX_BYTES } from '@/app/lib/initiative-logo'
import { createImageStore, imageExtension } from '@/app/services/cms-images/imageStorage'

const logos = createImageStore({
  prefix: 'assets/initiatives/',
  publicPath: '/api/initiatives/logos',
  filename: INITIATIVE_LOGO_FILENAME,
  maxBytes: INITIATIVE_LOGO_MAX_BYTES,
  label: 'initiative logo',
})

/** Check the image signature as well as the browser's declared MIME type. */
export const logoExtension = imageExtension

/** Store under an isolated prefix without changing the shared bucket's access policy. */
export const storeInitiativeLogo = logos.store

/** Only generated initiative filenames are reachable through the public image route. */
export const readInitiativeLogo = logos.read
