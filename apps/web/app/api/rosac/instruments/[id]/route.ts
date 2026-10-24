import { NextResponse } from 'next/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import { internalError, invalidBody, ok, readJson } from '@/app/lib/cms/http'
import {
  deleteRosacInstrument,
  rosacInstrumentUpdateSchema,
  updateRosacInstrument,
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

  const parsed = rosacInstrumentUpdateSchema.safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error)

  try {
    const result = await updateRosacInstrument(id, parsed.data)
    if (!result.ok) return writeFailure('el instrumento', id, result)

    return ok({ instrument: result.instrument })
  } catch (error) {
    return internalError('No se pudo guardar el instrumento.', error)
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
    const deleted = await deleteRosacInstrument(id)
    if (!deleted) return notFound('el instrumento', id)
  } catch (error) {
    return internalError('No se pudo eliminar el instrumento.', error)
  }

  return new NextResponse(null, { status: 204 })
}
