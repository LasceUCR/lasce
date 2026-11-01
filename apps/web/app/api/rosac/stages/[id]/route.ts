import { NextResponse } from 'next/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import {
  RosacConflictError,
  RosacReviewRequiredError,
  rosacStageInputSchema,
  updateRosacStage,
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

  const parsed = rosacStageInputSchema.safeParse(body)
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
  try {
    const stage = await updateRosacStage(id, parsed.data)
    if (!stage) {
      return NextResponse.json({ error: `No existe una etapa con id "${id}".` }, { status: 404 })
    }

    return NextResponse.json({ stage }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof RosacConflictError) {
      return NextResponse.json(
        { error: error.message, code: 'conflict' },
        { status: 409, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    if (error instanceof RosacReviewRequiredError) {
      return NextResponse.json(
        {
          error: error.message,
          code: 'review-required',
          pending: error.pending.map(({ locale, field }) => ({
            path: `content.${locale}.${field}`,
            locale,
            field,
          })),
        },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    throw error
  }
}
