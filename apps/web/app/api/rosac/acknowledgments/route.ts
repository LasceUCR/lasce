import { NextResponse } from 'next/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import {
  createRosacAcknowledgment,
  getRosacAcknowledgments,
  rosacAcknowledgmentInputSchema,
} from '@/app/lib/rosac'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  const acknowledgments = await getRosacAcknowledgments()
  return NextResponse.json({ acknowledgments }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request): Promise<NextResponse> {
  const guard = await requireApiPermission('create_components')
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

  const acknowledgment = await createRosacAcknowledgment(parsed.data)

  return NextResponse.json(
    { acknowledgment },
    { status: 201, headers: { 'Cache-Control': 'no-store' } },
  )
}
