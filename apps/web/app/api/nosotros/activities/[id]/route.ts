import { NextResponse } from 'next/server'

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
  const activity = await updateNosotrosActivity(id, parsed.data, guard.user.id)
  if (!activity) {
    return NextResponse.json({ error: `No existe una actividad con id "${id}".` }, { status: 404 })
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
  const deleted = await deleteNosotrosActivity(id)
  if (!deleted) {
    return NextResponse.json({ error: `No existe una actividad con id "${id}".` }, { status: 404 })
  }

  return new NextResponse(null, { status: 204 })
}
