import { NextResponse } from 'next/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import { internalError, invalidBody, ok, readJson } from '@/app/lib/cms/http'
import { createResearcher, getResearchers, rosacResearcherCreateSchema } from '@/app/lib/rosac'

export const dynamic = 'force-dynamic'

export async function GET(request?: Request): Promise<NextResponse> {
  const includeEditing = request
    ? new URL(request.url).searchParams.get('editing') === 'true'
    : false
  const researchers = await getResearchers(undefined, { includeEditingData: includeEditing })

  return NextResponse.json({ researchers }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request): Promise<NextResponse> {
  const guard = await requireApiPermission('create_components')
  if (!guard.ok) return guard.response

  const json = await readJson(request)
  if (!json.ok) return json.response

  const parsed = rosacResearcherCreateSchema.safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error)

  try {
    const researcher = await createResearcher(parsed.data, guard.user.id)
    return ok({ researcher }, 201)
  } catch (error) {
    return internalError('No se pudo guardar el investigador.', error)
  }
}
