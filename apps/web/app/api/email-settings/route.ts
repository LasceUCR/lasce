import type { NextResponse } from 'next/server'
import { getMessages, getTranslations } from 'next-intl/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import { errorResponse, internalError, ok, readJson } from '@/app/lib/cms/http'
import { getSmtpSettingsSchema, validateSmtpSettings } from '@/app/lib/mail-settings'
import { saveSmtpSettings } from '@/app/services/mail/smtpSettings'

/**
 * Saves the SMTP settings of the Correo section (`/administracion/correo`). Needs
 * `manage_email_settings`; hiding the page is not enough. The body is the form's values; an empty
 * `password` keeps the stored one. The answer never contains the password, in any form, and the
 * messages follow the administrator's language.
 */
export const dynamic = 'force-dynamic'

export async function PUT(request: Request): Promise<NextResponse> {
  const guard = await requireApiPermission('manage_email_settings')
  if (!guard.ok) return guard.response

  const [t, messages] = await Promise.all([
    getTranslations('administration.email.errors'),
    getMessages(),
  ])

  const json = await readJson(request)
  if (!json.ok) return json.response

  const validation = validateSmtpSettings(
    json.body,
    getSmtpSettingsSchema(messages.administration.email.validation),
  )
  if (!validation.ok) {
    return errorResponse(400, 'invalid-body', t('invalid'), {
      issues: Object.entries(validation.fieldErrors).map(([path, message]) => ({ path, message })),
    })
  }

  try {
    const result = await saveSmtpSettings(validation.data, guard.user)
    if (result.ok) return ok({ changed: result.changed })

    if (result.reason === 'key-unavailable') {
      return errorResponse(409, 'key-unavailable', t('keyUnavailable'))
    }
    return errorResponse(400, 'password-required', t('passwordRequired'))
  } catch (error) {
    return internalError(t('saveFailed'), error)
  }
}
