import { internalError, notFound } from '@/app/lib/cms/http'
import { COLLABORATION_LOGO_FILENAME } from '@/app/lib/collaboration-logo'
import { isNotFoundError } from '@/app/lib/suvi-storage'
import { readCollaborationLogo } from '@/app/services/collaborations/logoStorage'

export const runtime = 'nodejs'
type Context = { params: Promise<{ filename: string }> }

export async function GET(_request: Request, { params }: Context) {
  const { filename } = await params
  if (!COLLABORATION_LOGO_FILENAME.test(filename)) return notFound('El logo no existe.')
  try {
    const { body, contentType } = await readCollaborationLogo(filename)
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
