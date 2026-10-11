import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import {
  deleteNosotrosActivity,
  nosotrosActivityInputSchema,
  updateNosotrosActivity,
} from '@/app/lib/nosotros'

/**
 * Updates or deletes one "¿Qué hacemos?" activity flashcard
 * (LASCE-CON-012-086). PATCH needs `edit_components`; DELETE needs
 * `delete_components`. Hiding the pencil or trash is not enough — this is
 * the write path the public GET sibling deliberately has none of.
 */
export const dynamic = 'force-dynamic'

/** Ids are Postgres uuids. Anything else cannot match a row, and Prisma would throw on it. */
const activityIdSchema = z.uuid()

const ACTIVITY_GONE_MESSAGE =
  'Esta actividad ya no existe. Es posible que otra persona la haya eliminado; recargue la página.'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await requireApiPermission('edit_components')
  if (!guard.ok) return guard.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'El cuerpo de la solicitud no es JSON válido.' },
      { status: 400 },
    )
  }

  const parsed = nosotrosActivityInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Faltan campos obligatorios o no son válidos.',
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    )
  }

  const { id } = await params
  if (!activityIdSchema.safeParse(id).success) {
    return NextResponse.json({ error: ACTIVITY_GONE_MESSAGE }, { status: 404 })
  }

  let activity: Awaited<ReturnType<typeof updateNosotrosActivity>>
  try {
    activity = await updateNosotrosActivity(id, parsed.data, guard.user.id)
  } catch {
    return NextResponse.json(
      {
        error:
          'No se pudieron guardar los cambios: la base de datos no respondió. Inténtelo de nuevo en unos minutos.',
      },
      { status: 500 },
    )
  }

  if (!activity) {
    return NextResponse.json({ error: ACTIVITY_GONE_MESSAGE }, { status: 404 })
  }

  return NextResponse.json({ activity }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await requireApiPermission('delete_components')
  if (!guard.ok) return guard.response

  const { id } = await params
  if (!activityIdSchema.safeParse(id).success) {
    return NextResponse.json({ error: ACTIVITY_GONE_MESSAGE }, { status: 404 })
  }

  let deleted: boolean
  try {
    deleted = await deleteNosotrosActivity(id)
  } catch {
    return NextResponse.json(
      {
        error:
          'No se pudo eliminar la actividad: la base de datos no respondió. Inténtelo de nuevo en unos minutos.',
      },
      { status: 500 },
    )
  }

  if (!deleted) {
    return NextResponse.json({ error: ACTIVITY_GONE_MESSAGE }, { status: 404 })
  }

  return new NextResponse(null, { status: 204 })
}
