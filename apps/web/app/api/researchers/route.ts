import { NextResponse } from 'next/server'
import { getLocale } from 'next-intl/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import { internalError, invalidBody, ok, readJson } from '@/app/lib/cms/http'
import { resolveLocale } from '@/app/lib/i18n/locale'
import { getMessages } from '@/app/lib/i18n/messages'
import { getNosotrosResearcherCreateSchema } from '@/app/lib/nosotros-researcher-schema'
import { createResearcher, getResearchers } from '@/app/lib/rosac'

/**
 * Reads and creates ROSAC researcher profiles (LASCE-CON-012-085). GET is
 * public read-only content; POST requires `create_components`. PATCH and
 * DELETE in `[id]/route.ts` check `edit_components` and `delete_components`.
 */
export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  const researchers = await getResearchers(resolveLocale(await getLocale()))

  return NextResponse.json({ researchers }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request): Promise<NextResponse> {
  const guard = await requireApiPermission('create_components')
  if (!guard.ok) return guard.response

  const locale = resolveLocale(await getLocale())
  const messages = getMessages(locale)
  const errors = (messages.researchers as { errors?: Record<string, string> }).errors ?? {}

  const json = await readJson(request, errors.invalidJson)
  if (!json.ok) return json.response

  const parsed = getNosotrosResearcherCreateSchema(locale).safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error, errors.invalidBody)

  try {
    const researcher = await createResearcher(parsed.data, guard.user.id)

    return ok({ researcher }, 201)
  } catch (error) {
    return internalError(errors.saveError ?? 'No se pudo guardar el investigador.', error)
  }
}
