import type { NextResponse } from 'next/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import { internalError, invalidBody, ok, readJson } from '@/app/lib/cms/http'
import { indicatorOrderSchema, reorderIndicators } from '@/app/lib/home'

import { orderConflict } from '../http'

export const dynamic = 'force-dynamic'

/**
 * Sets the display order of the geomagnetic indices: `ids` lists every index once, in its new
 * order. A list that does not match the stored indices is refused as a conflict.
 */
export async function PUT(request: Request): Promise<NextResponse> {
  const guard = await requireApiPermission('edit_components')
  if (!guard.ok) return guard.response

  const json = await readJson(request)
  if (!json.ok) return json.response

  const parsed = indicatorOrderSchema.safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error)

  try {
    const result = await reorderIndicators(parsed.data, guard.user)
    if (!result.ok) return orderConflict()

    return ok({ ids: parsed.data.ids })
  } catch (error) {
    return internalError('No se pudo guardar el orden de los índices geomagnéticos.', error)
  }
}
