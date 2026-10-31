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
import { initiativeUpdateSchema } from '@/app/lib/initiative-schema'
import { deleteInitiative, updateInitiative } from '@/app/lib/initiative-writes'
import { writeFailure } from '../http'

export const dynamic = 'force-dynamic'
type Context = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Context) {
  const guard = await requireApiPermission('edit_components')
  if (!guard.ok) return guard.response
  const { id } = await params
  if (!isUuid(id)) return invalidId('El identificador de la iniciativa no es válido.')
  const json = await readJson(request)
  if (!json.ok) return json.response
  const parsed = initiativeUpdateSchema.safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error)
  try {
    const result = await updateInitiative(id, parsed.data)
    return result.ok ? ok({ initiative: result.value }) : writeFailure(result)
  } catch (error) {
    return internalError('No se pudo actualizar la iniciativa.', error)
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const guard = await requireApiPermission('delete_components')
  if (!guard.ok) return guard.response
  const { id } = await params
  if (!isUuid(id)) return invalidId('El identificador de la iniciativa no es válido.')
  try {
    if (!(await deleteInitiative(id))) return notFound('La iniciativa ya no existe.')
    return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return internalError('No se pudo eliminar la iniciativa.', error)
  }
}
