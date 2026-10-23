import type { NextResponse } from 'next/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import { internalError, invalidBody, ok, readJson } from '@/app/lib/cms/http'
import { rosacActivityUpdateSchema, updateRosacActivity } from '@/app/lib/rosac'

import { writeFailure } from '../../http'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await requireApiPermission('edit_components')
  if (!guard.ok) return guard.response

  const { id } = await params

  const json = await readJson(request)
  if (!json.ok) return json.response

  const parsed = rosacActivityUpdateSchema.safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error)

  try {
    const result = await updateRosacActivity(id, parsed.data)
    if (!result.ok) return writeFailure('la actividad', id, result)

    return ok({ activity: result.activity })
  } catch (error) {
    return internalError('No se pudo guardar la actividad.', error)
  }
}
