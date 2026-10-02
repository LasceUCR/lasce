import { NextResponse } from 'next/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import { createGallerySection, gallerySectionInputSchema } from '@/app/lib/gallery'

export const dynamic = 'force-dynamic'

export async function POST(request: Request): Promise<NextResponse> {
  const guard = await requireApiPermission('create_components')
  if (!guard.ok) return guard.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'El cuerpo de la solicitud no es JSON válido.' },
      { status: 400 },
    )
  }

  const parsed = gallerySectionInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Faltan campos obligatorios o no son válidos.',
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    )
  }

  const section = await createGallerySection(parsed.data)
  return NextResponse.json({ section }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
}
