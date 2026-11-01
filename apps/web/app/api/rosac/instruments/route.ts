import { NextResponse } from 'next/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import {
  createRosacInstrument,
  getRosacInstruments,
  rosacInstrumentInputSchema,
} from '@/app/lib/rosac'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  const instruments = await getRosacInstruments()
  return NextResponse.json({ instruments }, { headers: { 'Cache-Control': 'no-store' } })
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

  const instrument = await createRosacInstrument(parsed.data)

  return NextResponse.json(
    { instrument },
    { status: 201, headers: { 'Cache-Control': 'no-store' } },
  )
}
