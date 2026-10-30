import type { NextResponse } from 'next/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import { internalError, invalidBody, ok, readJson } from '@/app/lib/cms/http'
import { createNews, newsCreateSchema } from '@/app/lib/news'

import { writeFailure } from './http'

export const dynamic = 'force-dynamic'

/**
 * Creates a news item. Requires `create_components`. The body needs `content.es` and
 * `content.en` in full; see `newsCreateSchema`. Answers 201 with the stored item, including its
 * `editing.version`. There is no public GET: `/noticias` reads through `getNews()` in a Server
 * Component.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const guard = await requireApiPermission('create_components')
  if (!guard.ok) return guard.response

  const json = await readJson(request)
  if (!json.ok) return json.response

  const parsed = newsCreateSchema.safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error)

  try {
    const result = await createNews(parsed.data, guard.user)
    if (!result.ok) return writeFailure(result)

    return ok({ article: result.article }, 201)
  } catch (error) {
    return internalError('No se pudo guardar la noticia.', error)
  }
}
