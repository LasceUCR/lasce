import { NextResponse } from 'next/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import { internalError, invalidBody, ok, readJson } from '@/app/lib/cms/http'
import {
  createRosacAcknowledgment,
  getRosacAcknowledgments,
  rosacAcknowledgmentCreateSchema,
} from '@/app/lib/rosac'

export const dynamic = 'force-dynamic'

export async function GET(request?: Request): Promise<NextResponse> {
  const includeEditing = request
    ? new URL(request.url).searchParams.get('editing') === 'true'
    : false
  const acknowledgments = await getRosacAcknowledgments(undefined, {
    includeEditingData: includeEditing,
  })
  return NextResponse.json({ acknowledgments }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request): Promise<NextResponse> {
  const guard = await requireApiPermission('create_components')
  if (!guard.ok) return guard.response

  const json = await readJson(request)
  if (!json.ok) return json.response

  const parsed = rosacAcknowledgmentCreateSchema.safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error)

  try {
    const acknowledgment = await createRosacAcknowledgment(parsed.data)
    return ok({ acknowledgment }, 201)
  } catch (error) {
    return internalError('No se pudo guardar la institución.', error)
  }
}
