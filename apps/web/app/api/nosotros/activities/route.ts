import { NextResponse } from 'next/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import {
  createNosotrosActivity,
  getNosotrosActivities,
  nosotrosActivityInputSchema,
} from '@/app/lib/nosotros'

/**
 * Reads and creates "¿Qué hacemos?" flashcards (LASCE-CON-012-086). GET is
 * public read-only content; POST requires `create_components`. PATCH and
 * DELETE in `[id]/route.ts` check `edit_components` and `delete_components`.
 */
export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  const activities = await getNosotrosActivities()

  return NextResponse.json({ activities }, { headers: { 'Cache-Control': 'no-store' } })
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

  const activity = await createNosotrosActivity(parsed.data, guard.user.id)

  return NextResponse.json({ activity }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
}
