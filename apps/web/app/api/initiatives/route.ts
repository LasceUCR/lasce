import { getLocale } from 'next-intl/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import { internalError, invalidBody, ok, readJson } from '@/app/lib/cms/http'
import { getInitiativeRecords } from '@/app/lib/initiative-records'
import { initiativeCreateSchema } from '@/app/lib/initiative-schema'
import { createInitiative } from '@/app/lib/initiative-writes'
import { resolveLocale } from '@/app/lib/i18n/locale'
import { writeFailure } from './http'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return ok({ initiatives: await getInitiativeRecords(resolveLocale(await getLocale())) })
  } catch (error) {
    return internalError('No se pudieron cargar las iniciativas.', error)
  }
}

export async function POST(request: Request) {
  const guard = await requireApiPermission('create_components')
  if (!guard.ok) return guard.response
  const json = await readJson(request)
  if (!json.ok) return json.response
  const parsed = initiativeCreateSchema.safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error)
  try {
    const result = await createInitiative(parsed.data)
    return result.ok ? ok({ initiative: result.value }, 201) : writeFailure(result)
  } catch (error) {
    return internalError('No se pudo crear la iniciativa.', error)
  }
}
