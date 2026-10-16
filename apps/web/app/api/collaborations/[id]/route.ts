import { NextResponse } from 'next/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import {
  internalError,
  invalidBody,
  invalidId,
  isUuid,
  notFound,
  ok,
  readJson,
} from '@/app/lib/cms/http'
import { collaborationUpdateSchema } from '@/app/lib/collaboration-schema'
import { deleteCollaboration, updateCollaboration } from '@/app/lib/collaboration-writes'
import { writeFailure } from '../http'

export const dynamic = 'force-dynamic'
type Context = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Context) {
  const guard = await requireApiPermission('edit_components')
  if (!guard.ok) return guard.response
  const { id } = await params
  if (!isUuid(id)) return invalidId('El identificador de la colaboración no es válido.')
  const json = await readJson(request)
  if (!json.ok) return json.response
  const parsed = collaborationUpdateSchema.safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error)
  try {
    const result = await updateCollaboration(id, parsed.data)
    return result.ok ? ok({ collaboration: result.value }) : writeFailure(result)
  } catch (error) {
    return internalError('No se pudo actualizar la colaboración.', error)
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const guard = await requireApiPermission('delete_components')
  if (!guard.ok) return guard.response
  const { id } = await params
  if (!isUuid(id)) return invalidId('El identificador de la colaboración no es válido.')
  try {
    if (!(await deleteCollaboration(id))) return notFound('La colaboración ya no existe.')
    return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return internalError('No se pudo eliminar la colaboración.', error)
  }
}
