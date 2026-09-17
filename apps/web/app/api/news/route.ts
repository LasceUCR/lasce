import { NextResponse } from 'next/server'

import { requireAdmin } from '@/app/lib/auth/apiGuard'
import { createNews, newsInputSchema } from '@/app/lib/news'

/**
 * Creates a news item. Admin-only — the public `/noticias` page reads directly through
 * `getNews()` in a Server Component, so there is no public GET counterpart here, unlike
 * `nosotros/activities`.
 */
export const dynamic = 'force-dynamic'

export async function POST(request: Request): Promise<NextResponse> {
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

  const article = await createNews(parsed.data)

  return NextResponse.json({ article }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
}
