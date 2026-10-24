import { NextResponse } from 'next/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import { internalError, invalidBody, ok, readJson } from '@/app/lib/cms/http'
import {
  deleteRosacAcknowledgment,
  rosacAcknowledgmentUpdateSchema,
  updateRosacAcknowledgment,
} from '@/app/lib/rosac'

import { notFound, writeFailure } from '../../http'

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

  const parsed = rosacAcknowledgmentUpdateSchema.safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error)

  try {
    const result = await updateRosacAcknowledgment(id, parsed.data)
    if (!result.ok) return writeFailure('la institución', id, result)

    return ok({ acknowledgment: result.acknowledgment })
  } catch (error) {
    return internalError('No se pudo guardar la institución.', error)
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await requireApiPermission('delete_components')
  if (!guard.ok) return guard.response

  const { id } = await params

  try {
    const deleted = await deleteRosacAcknowledgment(id)
    if (!deleted) return notFound('la institución', id)
  } catch (error) {
    return internalError('No se pudo eliminar la institución.', error)
  }

  return new NextResponse(null, { status: 204 })
}
