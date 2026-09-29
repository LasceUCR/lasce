import { NextResponse } from 'next/server'

import { isNotFoundError, readSuviObject } from '@/app/lib/suvi-storage'

/**
 * Serves the latest SUVI preview WebP image the worker publishes at the end of `suvi-pipeline`
 * (`apps/worker/app/services/suvi_preview.py`). Backs the PoC page at `/suvi`.
 */
export const dynamic = 'force-dynamic'

const SLUG_PATTERN = /^[a-z0-9-]+$/

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ satellite: string; channel: string }> },
): Promise<NextResponse> {
  const { satellite, channel } = await params

  if (!SLUG_PATTERN.test(satellite) || !SLUG_PATTERN.test(channel)) {
    return NextResponse.json({ error: 'Satélite o canal inválido.' }, { status: 400 })
  }

  try {
    const buffer = await readSuviObject(`suvi/preview/${satellite}/${channel}.webp`)

    return new NextResponse(buffer, {
      headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'no-store' },
    })
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return NextResponse.json({ error: 'No hay imagen todavía' }, { status: 404 })
    }
    throw error
  }
}
