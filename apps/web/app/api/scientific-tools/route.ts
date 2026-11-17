import { getLocale } from 'next-intl/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import { internalError, invalidBody, ok, readJson } from '@/app/lib/cms/http'
import { resolveLocale } from '@/app/lib/i18n/locale'
import { getScientificToolRecords } from '@/app/lib/scientific-tool-records'
import { scientificToolCreateSchema } from '@/app/lib/scientific-tool-schema'
import { createScientificTool } from '@/app/lib/scientific-tool-writes'
import { writeFailure } from './http'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return ok({ tools: await getScientificToolRecords(resolveLocale(await getLocale())) })
  } catch (error) {
    return internalError('No se pudieron cargar las herramientas científicas.', error)
  }
}

export async function POST(request: Request) {
  const guard = await requireApiPermission('create_components')
  if (!guard.ok) return guard.response
  const json = await readJson(request)
  if (!json.ok) return json.response
  const parsed = scientificToolCreateSchema.safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error)
  try {
    const result = await createScientificTool(parsed.data, guard.user)
    return result.ok ? ok({ tool: result.value }, 201) : writeFailure(result)
  } catch (error) {
    return internalError('No se pudo crear la herramienta científica.', error)
  }
}
