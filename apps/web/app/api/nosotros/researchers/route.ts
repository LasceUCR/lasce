import { NextResponse } from 'next/server'
import { getLocale } from 'next-intl/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import { internalError, invalidBody, ok, readJson } from '@/app/lib/cms/http'
import { resolveLocale } from '@/app/lib/i18n/locale'
import { getMessages } from '@/app/lib/i18n/messages'
import {
  createNosotrosResearcher,
  getNosotrosResearcherCreateSchema,
  getNosotrosResearchers,
} from '@/app/lib/nosotros'

/**
 * Reads and creates Nosotros researcher profiles (LASCE-CON-012-086 follow-up).
 * GET is public read-only content, in the language of the request's `lasce_locale`
 * cookie and never with editing data; POST requires `create_components`. PATCH
 * and DELETE in `[id]/route.ts` check `edit_components` and
 * `delete_components`. Independent from `/api/researchers`, the ROSAC team.
 */
export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  const researchers = await getNosotrosResearchers(resolveLocale(await getLocale()))

  return NextResponse.json({ researchers }, { headers: { 'Cache-Control': 'no-store' } })
}

/**
 * Creates a profile. The body needs `content.es` and `content.en` in full (`role`, and an
 * optional `description` that is filled in both languages or in neither) plus the shared photo
 * (`src`), `name`, `institution` and optional `email`; see `nosotrosResearcherCreateSchema`.
 * Answers 201 with the stored profile, including its `editing.version`.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const guard = await requireApiPermission('create_components')
  if (!guard.ok) return guard.response

  const locale = resolveLocale(await getLocale())
  const messages = getMessages(locale)
  const errors = (messages.researchers as { errors?: Record<string, string> })?.errors ?? {}

  const json = await readJson(request, errors.invalidJson)
  if (!json.ok) return json.response

  const parsed = getNosotrosResearcherCreateSchema(locale).safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error, errors.invalidBody)

  try {
    const researcher = await createNosotrosResearcher(parsed.data, guard.user.id)

    return ok({ researcher }, 201)
  } catch (error) {
    return internalError(errors.saveError ?? 'No se pudo guardar el investigador.', error)
  }
}
