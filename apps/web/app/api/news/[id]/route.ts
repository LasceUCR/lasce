import { NextResponse } from 'next/server'

import { requireAdmin } from '@/app/lib/auth/apiGuard'
import { deleteNews, newsInputSchema, updateNews } from '@/app/lib/news'

/** Updates or deletes one news item. Admin-only, same guard as `POST` in `route.ts`. */
export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await requireAdmin()
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

  const parsed = newsInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Faltan campos obligatorios o no son válidos.',
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    )
  }

  const { id } = await params
  const article = await updateNews(id, parsed.data)
  if (!article) {
    return NextResponse.json({ error: `No existe una noticia con id "${id}".` }, { status: 404 })
  }

  return NextResponse.json({ article }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  const { id } = await params
  const deleted = await deleteNews(id)
  if (!deleted) {
    return NextResponse.json({ error: `No existe una noticia con id "${id}".` }, { status: 404 })
  }

  return new NextResponse(null, { status: 204 })
}
