import { NextResponse } from 'next/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import {
  createNosotrosResearcher,
  getNosotrosResearchers,
  nosotrosResearcherInputSchema,
} from '@/app/lib/nosotros'

/**
 * Reads and creates Nosotros researcher profiles (LASCE-CON-012-086 follow-up).
 * GET is public read-only content; POST requires `create_components`. PATCH
 * and DELETE in `[id]/route.ts` check `edit_components` and
 * `delete_components`. Independent from `/api/researchers`, the ROSAC team.
 */
export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  const researchers = await getNosotrosResearchers()

  return NextResponse.json({ researchers }, { headers: { 'Cache-Control': 'no-store' } })
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

  const parsed = nosotrosResearcherInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Faltan campos obligatorios o no son válidos.',
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    )
  }

  const researcher = await createNosotrosResearcher(parsed.data, guard.user.id)

  return NextResponse.json(
    { researcher },
    { status: 201, headers: { 'Cache-Control': 'no-store' } },
  )
}
