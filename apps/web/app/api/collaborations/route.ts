import { getLocale } from 'next-intl/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import { internalError, invalidBody, ok, readJson } from '@/app/lib/cms/http'
import { getCollaborationRecords } from '@/app/lib/collaboration-records'
import { collaborationCreateSchema } from '@/app/lib/collaboration-schema'
import { createCollaboration } from '@/app/lib/collaboration-writes'
import { resolveLocale } from '@/app/lib/i18n/locale'
import { writeFailure } from './http'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return ok({ collaborations: await getCollaborationRecords(resolveLocale(await getLocale())) })
  } catch (error) {
    return internalError('No se pudieron cargar las colaboraciones.', error)
  }
}

export async function POST(request: Request) {
  const guard = await requireApiPermission('create_components')
  if (!guard.ok) return guard.response
  const json = await readJson(request)
  if (!json.ok) return json.response
  const parsed = collaborationCreateSchema.safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error)
  try {
    const result = await createCollaboration(parsed.data, guard.user)
    return result.ok ? ok({ collaboration: result.value }, 201) : writeFailure(result)
  } catch (error) {
    return internalError('No se pudo crear la colaboración.', error)
  }
}
