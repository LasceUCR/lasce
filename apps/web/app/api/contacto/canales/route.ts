import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import { internalError, invalidBody, ok, readJson } from '@/app/lib/cms/http'
import { contactChannelCreateSchema } from '@/app/lib/contact-channel-schema'
import { createContactChannel } from '@/app/lib/contact-channels'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const guard = await requireApiPermission('create_components')
  if (!guard.ok) return guard.response

  const json = await readJson(request)
  if (!json.ok) return json.response

  const parsed = contactChannelCreateSchema.safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error)

  try {
    const card = await createContactChannel(parsed.data)
    return ok({ card }, 201)
  } catch (error) {
    return internalError('No se pudo crear el canal de contacto.', error)
  }
}
