import { NextResponse } from 'next/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import {
  createResearchArea,
  getResearchAreas,
  researchAreaInputSchema,
} from '@/app/lib/research-areas'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  const areas = await getResearchAreas()

  return NextResponse.json({ areas }, { headers: { 'Cache-Control': 'no-store' } })
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

  const parsed = researchAreaInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Faltan campos obligatorios o no son válidos.',
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    )
  }

  const area = await createResearchArea(parsed.data)

  return NextResponse.json({ area }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
}
