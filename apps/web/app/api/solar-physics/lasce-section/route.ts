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
  solarPhysicsSectionUpdateSchema,
  updateSolarPhysicsSection,
  type SolarPhysicsSectionWriteFailure,
} from '@/app/lib/solar-physics-section'

export const dynamic = 'force-dynamic'

/** Maps an expected write failure to its response. */
function writeFailure(failure: SolarPhysicsSectionWriteFailure): NextResponse {
  switch (failure.reason) {
    case 'not-found':
      return notFound('No existe la sección de LASCE de Física Solar.')
    case 'conflict':
      return conflict(
        'La sección cambió desde que la abrió. Recárguela y vuelva a aplicar sus cambios.',
      )
    case 'review-required':
      return reviewRequired(failure.pending)
  }
}

/**
 * Updates the "El trabajo de LASCE en Física Solar" section of `/fisica-solar` against the
 * `version` the editor loaded. The content is sent in every language. See
 * `solarPhysicsSectionUpdateSchema`.
 */
export async function PATCH(request: Request): Promise<NextResponse> {
  const guard = await requireApiPermission('edit_components')
  if (!guard.ok) return guard.response

  const json = await readJson(request)
  if (!json.ok) return json.response

  const parsed = solarPhysicsSectionUpdateSchema.safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error)

  try {
    const result = await updateSolarPhysicsSection(parsed.data)
    if (!result.ok) return writeFailure(result)

    return ok({ section: result.section })
  } catch (error) {
    return internalError('No se pudo guardar la sección.', error)
  }
}
