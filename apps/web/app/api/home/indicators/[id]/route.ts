import type { NextResponse } from 'next/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import { internalError, invalidBody, isUuid, ok, readJson } from '@/app/lib/cms/http'
import { indicatorUpdateSchema, updateIndicator } from '@/app/lib/home'

import { invalidIndicatorId, writeFailure } from '../../http'

export const dynamic = 'force-dynamic'

/**
 * Saves a geomagnetic index against the `version` the editor loaded: its shared `value`, its
 * description in every language (`content`), or both. See `indicatorUpdateSchema`. Indices are
 * never created or deleted here.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await requireApiPermission('edit_components')
  if (!guard.ok) return guard.response

  const { id } = await params
  if (!isUuid(id)) return invalidIndicatorId()

  const json = await readJson(request)
  if (!json.ok) return json.response

  const parsed = indicatorUpdateSchema.safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error)

  try {
    const result = await updateIndicator(id, parsed.data, guard.user)
    if (!result.ok) return writeFailure('indicator', result)

    return ok({ indicator: result.indicator })
  } catch (error) {
    return internalError('No se pudo guardar el índice geomagnético.', error)
  }
}
