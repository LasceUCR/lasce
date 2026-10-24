import type { NextResponse } from 'next/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import { internalError, invalidBody, ok, readJson } from '@/app/lib/cms/http'
import { rosacStageUpdateSchema, updateRosacStage } from '@/app/lib/rosac'

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

  const parsed = rosacStageUpdateSchema.safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error)

  try {
    const result = await updateRosacStage(id, parsed.data)
    if (!result.ok) return writeFailure('la etapa de construcción', id, result)

    return ok({ stage: result.stage })
  } catch (error) {
    return internalError('No se pudo guardar la etapa de construcción.', error)
  }
}
