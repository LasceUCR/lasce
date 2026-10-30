import { NextResponse } from 'next/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import {
  deleteRosacAcknowledgment,
  rosacAcknowledgmentInputSchema,
  updateRosacAcknowledgment,
} from '@/app/lib/rosac'

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

  const parsed = rosacAcknowledgmentInputSchema.safeParse(body)
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
  const acknowledgment = await updateRosacAcknowledgment(id, parsed.data)
  if (!acknowledgment) {
    return NextResponse.json(
      { error: `No existe una institución con id "${id}".` },
      { status: 404 },
    )
  }

  return NextResponse.json({ acknowledgment }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await requireApiPermission('delete_components')
  if (!guard.ok) return guard.response

  const { id } = await params
  const deleted = await deleteRosacAcknowledgment(id)
  if (!deleted) {
    return NextResponse.json(
      { error: `No existe una institución con id "${id}".` },
      { status: 404 },
    )
  }

  return new NextResponse(null, { status: 204 })
}
