import { NextResponse } from 'next/server'
import { getLocale } from 'next-intl/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import {
  academicActivityInputSchema,
  createAcademicActivity,
  getAcademicActivities,
} from '@/app/lib/academic-activities'
import { resolveLocale } from '@/app/lib/i18n/locale'

/**
 * Reads and creates academic activities. GET is public read-only content; POST requires
 * `create_components`. PATCH and DELETE in `[id]/route.ts` check `edit_components` and
 * `delete_components`.
 */
export const dynamic = 'force-dynamic'

/** Public list, in the language of the request's `lasce_locale` cookie. */
export async function GET(): Promise<NextResponse> {
  const activities = await getAcademicActivities(resolveLocale(await getLocale()))

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

  const parsed = academicActivityInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Faltan campos obligatorios o no son válidos.',
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    )
  }

  try {
    const activity = await createAcademicActivity(parsed.data, guard.user.id)

    return NextResponse.json(
      { activity },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json(
      {
        error:
          'No se pudo guardar la actividad: la base de datos no respondió. Inténtelo de nuevo en unos minutos.',
      },
      { status: 500 },
    )
  }
}
