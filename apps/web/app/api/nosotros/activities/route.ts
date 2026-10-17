import { NextResponse } from 'next/server'
import { getLocale } from 'next-intl/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import { internalError, invalidBody, ok, readJson } from '@/app/lib/cms/http'
import { resolveLocale } from '@/app/lib/i18n/locale'
import {
  createNosotrosActivity,
  getNosotrosActivities,
  nosotrosActivityCreateSchema,
} from '@/app/lib/nosotros'

/**
 * Reads and creates "¿Qué hacemos?" flashcards (LASCE-CON-012-086). GET is
 * public read-only content, in the language of the request's `lasce_locale`
 * cookie and never with editing data; POST requires `create_components`.
 * PATCH and DELETE in `[id]/route.ts` check `edit_components` and
 * `delete_components`.
 */
export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  const activities = await getNosotrosActivities(resolveLocale(await getLocale()))

  return NextResponse.json({ activities }, { headers: { 'Cache-Control': 'no-store' } })
}

/**
 * Creates a card. The body needs an `icon` and `content.es` and `content.en` in full; see
 * `nosotrosActivityCreateSchema`. Answers 201 with the stored card, including its
 * `editing.version`.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const guard = await requireApiPermission('create_components')
  if (!guard.ok) return guard.response

  const json = await readJson(request)
  if (!json.ok) return json.response

  const parsed = nosotrosActivityCreateSchema.safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error)

  try {
    const activity = await createNosotrosActivity(parsed.data, guard.user.id)

    return ok({ activity }, 201)
  } catch (error) {
    return internalError('No se pudo guardar la actividad.', error)
  }
}
