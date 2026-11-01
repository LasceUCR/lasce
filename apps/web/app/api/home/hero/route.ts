import type { NextResponse } from 'next/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import { internalError, invalidBody, ok, readJson } from '@/app/lib/cms/http'
import { heroUpdateSchema, updateHero } from '@/app/lib/home'

import { writeFailure } from '../http'

export const dynamic = 'force-dynamic'

/**
 * Saves the home page banner's title and subtitle in every language, against the `version` the
 * editor loaded. See `heroUpdateSchema`. The banner is never created or deleted here.
 */
export async function PATCH(request: Request): Promise<NextResponse> {
  const guard = await requireApiPermission('edit_components')
  if (!guard.ok) return guard.response

  const json = await readJson(request)
  if (!json.ok) return json.response

  const parsed = heroUpdateSchema.safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error)

  try {
    const result = await updateHero(parsed.data, guard.user)
    if (!result.ok) return writeFailure('hero', result)

    return ok({ hero: result.hero })
  } catch (error) {
    return internalError('No se pudo guardar la portada.', error)
  }
}
