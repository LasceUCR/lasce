import { internalError, notFound } from '@/app/lib/cms/http'
import { INITIATIVE_LOGO_FILENAME } from '@/app/lib/initiative-logo'
import { isNotFoundError } from '@/app/lib/suvi-storage'
import { readInitiativeLogo } from '@/app/services/initiatives/logoStorage'

export const runtime = 'nodejs'
type Context = { params: Promise<{ filename: string }> }

export async function GET(_request: Request, { params }: Context) {
  const { filename } = await params
  if (!INITIATIVE_LOGO_FILENAME.test(filename)) return notFound('El logo no existe.')
  try {
    const { body, contentType } = await readInitiativeLogo(filename)
    return new Response(new Uint8Array(body), {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(body.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    if (isNotFoundError(error)) return notFound('El logo no existe.')
    return internalError('No se pudo cargar el logo.', error)
  }
}
