import { NextResponse } from 'next/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import {
  deleteRosacInstrument,
  rosacInstrumentInputSchema,
  updateRosacInstrument,
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

  const parsed = rosacInstrumentInputSchema.safeParse(body)
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
  const instrument = await updateRosacInstrument(id, parsed.data)
  if (!instrument) {
    return NextResponse.json({ error: `No existe un instrumento con id "${id}".` }, { status: 404 })
  }

  return NextResponse.json({ instrument }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await requireApiPermission('delete_components')
  if (!guard.ok) return guard.response

  const { id } = await params
  const deleted = await deleteRosacInstrument(id)
  if (!deleted) {
    return NextResponse.json({ error: `No existe un instrumento con id "${id}".` }, { status: 404 })
  }

  return new NextResponse(null, { status: 204 })
}
