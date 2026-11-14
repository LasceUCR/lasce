import { getTranslations } from 'next-intl/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import { errorResponse, internalError, ok } from '@/app/lib/cms/http'
import { readImageUpload } from '@/app/lib/cms/image-upload'
import {
  SCIENTIFIC_TOOL_IMAGE_ACCEPT,
  SCIENTIFIC_TOOL_IMAGE_MAX_BYTES,
} from '@/app/lib/scientific-tool-image'
import { storeScientificToolImage } from '@/app/services/scientific-tools/imageStorage'

export const runtime = 'nodejs'

const messageKeys = {
  'invalid-upload': 'missing',
  'missing-file': 'missing',
  'file-too-large': 'tooLarge',
  'invalid-file-type': 'invalidType',
} as const

/** `?mode=create` needs `create_components`; `?mode=edit` needs `edit_components`. */
export async function POST(request: Request) {
  const mode = new URL(request.url).searchParams.get('mode')
  const guard = await requireApiPermission(
    mode === 'edit' ? 'edit_components' : 'create_components',
  )
  if (!guard.ok) return guard.response
  const t = await getTranslations('scientificTools.upload')
  if (mode !== 'create' && mode !== 'edit') {
    return errorResponse(400, 'invalid-upload', t('failed'))
  }
  try {
    const upload = await readImageUpload(request, {
      maxBytes: SCIENTIFIC_TOOL_IMAGE_MAX_BYTES,
      accept: SCIENTIFIC_TOOL_IMAGE_ACCEPT,
    })
    if (!upload.ok) return errorResponse(upload.status, upload.code, t(messageKeys[upload.code]))
    return ok({ imageUrl: await storeScientificToolImage(upload.body, upload.contentType) }, 201)
  } catch (error) {
    return internalError(t('failed'), error)
  }
}
