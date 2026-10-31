import { getTranslations } from 'next-intl/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import { errorResponse, internalError, ok } from '@/app/lib/cms/http'
import { INITIATIVE_LOGO_ACCEPT, INITIATIVE_LOGO_MAX_BYTES } from '@/app/lib/initiative-logo'
import { logoExtension, storeInitiativeLogo } from '@/app/services/initiatives/logoStorage'

export const runtime = 'nodejs'

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
  // Leave room for multipart headers while bounding the body before parsing it.
  const maxBody = INITIATIVE_LOGO_MAX_BYTES + 1024 * 1024
  if (Number(request.headers.get('content-length')) > maxBody) {
    return errorResponse(413, 'file-too-large', t('tooLarge'))
  }
  let data: FormData
  try {
    if (!request.body) return errorResponse(400, 'missing-file', t('missing'))
    const chunks: Uint8Array[] = []
    let size = 0
    const reader = request.body.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > maxBody) {
          await reader.cancel()
          return errorResponse(413, 'file-too-large', t('tooLarge'))
        }
        chunks.push(value)
      }
    } finally {
      reader.releaseLock()
    }
    data = await new Response(new Uint8Array(Buffer.concat(chunks)), {
      headers: request.headers,
    }).formData()
  } catch {
    return errorResponse(400, 'invalid-upload', t('missing'))
  }
  const file = data.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return errorResponse(400, 'missing-file', t('missing'))
  }
  if (file.size > INITIATIVE_LOGO_MAX_BYTES) {
    return errorResponse(413, 'file-too-large', t('tooLarge'))
  }
  if (!INITIATIVE_LOGO_ACCEPT.split(',').includes(file.type)) {
    return errorResponse(415, 'invalid-file-type', t('invalidType'))
  }
  try {
    const body = Buffer.from(await file.arrayBuffer())
    if (!logoExtension(body, file.type)) {
      return errorResponse(415, 'invalid-file-type', t('invalidType'))
    }
    return ok({ logoUrl: await storeInitiativeLogo(body, file.type) }, 201)
  } catch (error) {
    return internalError(t('failed'), error)
  }
}
