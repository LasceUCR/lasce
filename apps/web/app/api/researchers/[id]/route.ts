import { NextResponse } from 'next/server'

import { requireAdmin } from '@/app/lib/auth/apiGuard'
import { deleteResearcher, researcherInputSchema, updateResearcher } from '@/app/lib/rosac'

/**
 * Updates or deletes one ROSAC researcher profile (LASCE-CON-012-085).
 * Admin-only — this is the write path the public GET sibling deliberately
 * has none of. `US-29 Access the Administration Panel` is still pending, so
 * this route (via `requireAdmin`) is today's only real enforcement point for
 * that requirement.
 */
export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await requireAdmin()
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

  const parsed = researcherInputSchema.safeParse(body)
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
  const researcher = await updateResearcher(id, parsed.data, guard.user.id)
  if (!researcher) {
    return NextResponse.json(
      { error: `No existe un investigador con id "${id}".` },
      { status: 404 },
    )
  }

  return NextResponse.json({ researcher }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  const { id } = await params
  const deleted = await deleteResearcher(id)
  if (!deleted) {
    return NextResponse.json(
      { error: `No existe un investigador con id "${id}".` },
      { status: 404 },
    )
  }

  return new NextResponse(null, { status: 204 })
}
