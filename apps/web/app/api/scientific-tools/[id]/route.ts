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
import { scientificToolUpdateSchema } from '@/app/lib/scientific-tool-schema'
import { deleteScientificTool, updateScientificTool } from '@/app/lib/scientific-tool-writes'
import { NOT_FOUND_MESSAGE, writeFailure } from '../http'

export const dynamic = 'force-dynamic'
type Context = { params: Promise<{ id: string }> }

const INVALID_ID = 'El identificador de la herramienta científica no es válido.'

export async function PATCH(request: Request, { params }: Context) {
  const guard = await requireApiPermission('edit_components')
  if (!guard.ok) return guard.response
  const { id } = await params
  if (!isUuid(id)) return invalidId(INVALID_ID)
  const json = await readJson(request)
  if (!json.ok) return json.response
  const parsed = scientificToolUpdateSchema.safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error)
  try {
    const result = await updateScientificTool(id, parsed.data, guard.user)
    return result.ok ? ok({ tool: result.value }) : writeFailure(result)
  } catch (error) {
    return internalError('No se pudo actualizar la herramienta científica.', error)
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const guard = await requireApiPermission('delete_components')
  if (!guard.ok) return guard.response
  const { id } = await params
  if (!isUuid(id)) return invalidId(INVALID_ID)
  try {
    if (!(await deleteScientificTool(id, guard.user))) return notFound(NOT_FOUND_MESSAGE)
    return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return internalError('No se pudo eliminar la herramienta científica.', error)
  }
}
