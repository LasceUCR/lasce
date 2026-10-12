import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import {
  deleteNews,
  DUPLICATE_NEWS_LINK,
  DUPLICATE_NEWS_LINK_MESSAGE,
  newsInputSchema,
  updateNews,
} from '@/app/lib/news'

/** Updates or deletes one news item. PATCH needs `edit_components`; DELETE needs
 * `delete_components` — same pattern as `nosotros/activities/[id]/route.ts`. */
export const dynamic = 'force-dynamic'

/** Ids are Postgres uuids. Anything else cannot match a row, and Prisma would throw on it. */
const newsIdSchema = z.uuid()

const NEWS_GONE_MESSAGE =
  'Esta noticia ya no existe. Es posible que otra persona la haya eliminado; recargue la página.'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await requireApiPermission('edit_components')
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
  if (!newsIdSchema.safeParse(id).success) {
    return NextResponse.json({ error: NEWS_GONE_MESSAGE }, { status: 404 })
  }

  let article: Awaited<ReturnType<typeof updateNews>>
  try {
    article = await updateNews(id, parsed.data)
  } catch {
    return NextResponse.json(
      {
        error:
          'No se pudieron guardar los cambios de la noticia: la base de datos no respondió. Inténtelo de nuevo en unos minutos.',
      },
      { status: 500 },
    )
  }

  if (!article) {
    return NextResponse.json({ error: NEWS_GONE_MESSAGE }, { status: 404 })
  }
  if (article === DUPLICATE_NEWS_LINK) {
    return NextResponse.json({ error: DUPLICATE_NEWS_LINK_MESSAGE }, { status: 409 })
  }

  return NextResponse.json({ article }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await requireApiPermission('delete_components')
  if (!guard.ok) return guard.response

  const { id } = await params
  if (!newsIdSchema.safeParse(id).success) {
    return NextResponse.json({ error: NEWS_GONE_MESSAGE }, { status: 404 })
  }

  let deleted: boolean
  try {
    deleted = await deleteNews(id)
  } catch {
    return NextResponse.json(
      {
        error:
          'No se pudo eliminar la noticia: la base de datos no respondió. Inténtelo de nuevo en unos minutos.',
      },
      { status: 500 },
    )
  }

  if (!deleted) {
    return NextResponse.json({ error: NEWS_GONE_MESSAGE }, { status: 404 })
  }

  return new NextResponse(null, { status: 204 })
}
