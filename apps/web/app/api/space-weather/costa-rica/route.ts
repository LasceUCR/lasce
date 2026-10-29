import type { NextResponse } from 'next/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import {
  conflict,
  internalError,
  invalidBody,
  notFound,
  ok,
  readJson,
  reviewRequired,
} from '@/app/lib/cms/http'
import {
  spaceWeatherSectionUpdateSchema,
  updateSpaceWeatherSection,
  type SpaceWeatherSectionWriteFailure,
} from '@/app/lib/space-weather-section'

export const dynamic = 'force-dynamic'

/** Maps an expected write failure to its response, in Spanish, the API's language. */
function writeFailure(failure: SpaceWeatherSectionWriteFailure): NextResponse {
  switch (failure.reason) {
    case 'not-found':
      return notFound('No existe la sección «¿Por qué estudiarlo desde Costa Rica?».')
    case 'conflict':
      return conflict(
        'La sección cambió desde que la abrió. Recárguela y vuelva a aplicar sus cambios.',
      )
    case 'review-required':
      return reviewRequired(failure.pending)
  }
}

/**
 * Saves the "¿Por qué estudiarlo desde Costa Rica?" card of `/clima-espacial` in every language,
 * against the `version` the editor loaded. See `spaceWeatherSectionUpdateSchema`. The card is
 * never created or deleted here.
 */
export async function PATCH(request: Request): Promise<NextResponse> {
  const guard = await requireApiPermission('edit_components')
  if (!guard.ok) return guard.response

  const json = await readJson(request)
  if (!json.ok) return json.response

  const parsed = spaceWeatherSectionUpdateSchema.safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error)

  try {
    const result = await updateSpaceWeatherSection(parsed.data, guard.user)
    if (!result.ok) return writeFailure(result)

    return ok({ section: result.section })
  } catch (error) {
    return internalError('No se pudo guardar la sección.', error)
  }
}
