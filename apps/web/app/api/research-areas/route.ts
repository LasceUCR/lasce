import { NextResponse } from 'next/server'
import { getLocale } from 'next-intl/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import { internalError, invalidBody, ok, readJson } from '@/app/lib/cms/http'
import { resolveLocale } from '@/app/lib/i18n/locale'
import { researchAreaCreateSchema } from '@/app/lib/research-area-schema'
import { createResearchArea, getResearchAreasPage } from '@/app/lib/research-areas'
import { PAGE_PARAM, parsePageParam } from '@/app/lib/pagination'

export const dynamic = 'force-dynamic'

/** Public list, in the language of the request's `lasce_locale` cookie. Never editing data. */
export async function GET(request: Request): Promise<NextResponse> {
  const values = new URL(request.url).searchParams.getAll(PAGE_PARAM)
  const result = await getResearchAreasPage(resolveLocale(await getLocale()), {
    page: parsePageParam(values.length > 1 ? values : values[0]),
  })

  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
}

/**
 * Creates a research area. The body needs the title and description in every language
 * (`content.es`, `content.en`) and the photo (`src`); see `researchAreaCreateSchema`. Answers 201
 * with the stored area, including its `editing.version`.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const guard = await requireApiPermission('create_components')
  if (!guard.ok) return guard.response

  const json = await readJson(request)
  if (!json.ok) return json.response

  const parsed = researchAreaCreateSchema.safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error)

  try {
    const { area } = await createResearchArea(parsed.data)
    return ok({ area }, 201)
  } catch (error) {
    return internalError('No se pudo crear el área de investigación.', error)
  }
}
