import { NextResponse } from 'next/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import {
  createNews,
  DUPLICATE_NEWS_LINK,
  DUPLICATE_NEWS_LINK_MESSAGE,
  newsInputSchema,
} from '@/app/lib/news'

/**
 * Creates a news item. Requires `create_components` — the public `/noticias` page reads
 * directly through `getNews()` in a Server Component, so there is no public GET counterpart
 * here, unlike `nosotros/activities`.
 */
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

  let article: Awaited<ReturnType<typeof createNews>>
  try {
    article = await createNews(parsed.data)
  } catch {
    return NextResponse.json(
      {
        error:
          'No se pudo guardar la noticia: la base de datos no respondió. Inténtelo de nuevo en unos minutos.',
      },
      { status: 500 },
    )
  }

  if (article === DUPLICATE_NEWS_LINK) {
    return NextResponse.json({ error: DUPLICATE_NEWS_LINK_MESSAGE }, { status: 409 })
  }

  return NextResponse.json({ article }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
}
