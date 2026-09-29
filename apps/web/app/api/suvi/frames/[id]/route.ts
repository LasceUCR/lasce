import { NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@lasce/db'

import { isNotFoundError, readSuviObject } from '@/app/lib/suvi-storage'

/**
 * Serves one catalogued SUVI frame's archival WebP (`suvi_frames.preview_file`), the image URL
 * the `/datos` explorer receives from `querySuviFrames`. The bucket stays private; only keys
 * recorded on a `suvi_frames` row are reachable through here.
 */
export const dynamic = 'force-dynamic'

const frameId = z.uuid()

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params

  if (!frameId.safeParse(id).success) {
    return NextResponse.json({ error: 'Identificador de imagen inválido.' }, { status: 400 })
  }

  const frame = await prisma.suviFrame.findUnique({
    where: { id },
    select: { previewFile: true },
  })
  if (!frame?.previewFile) {
    return NextResponse.json({ error: 'La imagen solicitada no existe.' }, { status: 404 })
  }

  try {
    const buffer = await readSuviObject(frame.previewFile)

    // An archival key is per observation timestamp, so its bytes never change.
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return NextResponse.json({ error: 'La imagen solicitada no existe.' }, { status: 404 })
    }
    throw error
  }
}
