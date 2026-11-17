import { internalError, notFound } from '@/app/lib/cms/http'
import { SCIENTIFIC_TOOL_IMAGE_FILENAME } from '@/app/lib/scientific-tool-image'
import { isNotFoundError } from '@/app/lib/suvi-storage'
import { readScientificToolImage } from '@/app/services/scientific-tools/imageStorage'

export const runtime = 'nodejs'
type Context = { params: Promise<{ filename: string }> }

export async function GET(_request: Request, { params }: Context) {
  const { filename } = await params
  if (!SCIENTIFIC_TOOL_IMAGE_FILENAME.test(filename)) return notFound('La imagen no existe.')
  try {
    const { body, contentType } = await readScientificToolImage(filename)
    return new Response(new Uint8Array(body), {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(body.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    if (isNotFoundError(error)) return notFound('La imagen no existe.')
    return internalError('No se pudo cargar la imagen.', error)
  }
}
