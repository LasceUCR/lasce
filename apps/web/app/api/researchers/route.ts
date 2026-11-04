import { NextResponse } from 'next/server'
import { getLocale } from 'next-intl/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import { resolveLocale } from '@/app/lib/i18n/locale'
import { getNosotrosResearcherCreateSchema } from '@/app/lib/nosotros-researcher-schema'
import { createResearcher, getResearchers } from '@/app/lib/rosac'

/**
 * Reads and creates ROSAC researcher profiles (LASCE-CON-012-085). GET is
 * public read-only content; POST requires `create_components`. PATCH and
 * DELETE in `[id]/route.ts` check `edit_components` and `delete_components`.
 */
export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  const researchers = await getResearchers(resolveLocale(await getLocale()))

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

  const parsed = getNosotrosResearcherCreateSchema(resolveLocale(await getLocale())).safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Faltan campos obligatorios o no son válidos.',
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    )
  }

  const researcher = await createResearcher(parsed.data, guard.user.id)

  return NextResponse.json(
    { researcher },
    { status: 201, headers: { 'Cache-Control': 'no-store' } },
  )
}
