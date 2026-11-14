import { getTranslations } from 'next-intl/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import { errorResponse, internalError, ok } from '@/app/lib/cms/http'
import { readImageUpload } from '@/app/lib/cms/image-upload'
import { INITIATIVE_LOGO_ACCEPT, INITIATIVE_LOGO_MAX_BYTES } from '@/app/lib/initiative-logo'
import { storeInitiativeLogo } from '@/app/services/initiatives/logoStorage'

export const runtime = 'nodejs'

const messageKeys = {
  'invalid-upload': 'missing',
  'missing-file': 'missing',
  'file-too-large': 'tooLarge',
  'invalid-file-type': 'invalidType',
} as const

export async function POST(request: Request) {
  const mode = new URL(request.url).searchParams.get('mode')
  const guard = await requireApiPermission(
    mode === 'edit' ? 'edit_components' : 'create_components',
  )
  if (!guard.ok) return guard.response
  const t = await getTranslations('initiatives.upload')
  if (mode !== 'create' && mode !== 'edit') {
    return errorResponse(400, 'invalid-upload', t('failed'))
  }
  try {
    const upload = await readImageUpload(request, {
      maxBytes: INITIATIVE_LOGO_MAX_BYTES,
      accept: INITIATIVE_LOGO_ACCEPT,
    })
    if (!upload.ok) return errorResponse(upload.status, upload.code, t(messageKeys[upload.code]))
    return ok({ logoUrl: await storeInitiativeLogo(upload.body, upload.contentType) }, 201)
  } catch (error) {
    return internalError(t('failed'), error)
  }
}
