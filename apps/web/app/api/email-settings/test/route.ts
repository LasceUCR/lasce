import type { NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'

import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import { errorResponse, ok } from '@/app/lib/cms/http'
import { sendMail } from '@/app/services/mail/mailer'

/**
 * Sends a test message with the saved SMTP settings to the signed-in administrator's own
 * address, so the settings can be checked without involving anyone else. Needs
 * `manage_email_settings`. A failure names what to check (not configured, unreadable password,
 * the server refused), never the SMTP server's own reply, which stays in the server log.
 */
export const dynamic = 'force-dynamic'

export async function POST(): Promise<NextResponse> {
  const guard = await requireApiPermission('manage_email_settings')
  if (!guard.ok) return guard.response

  const t = await getTranslations('administration.email')
  const result = await sendMail({
    to: guard.user.email,
    subject: t('testEmail.subject'),
    text: t('testEmail.body'),
  })

  if (result.ok) return ok({ sentTo: guard.user.email })

  switch (result.reason) {
    case 'not-configured':
      return errorResponse(409, 'not-configured', t('errors.notConfigured'))
    case 'password-unreadable':
      return errorResponse(409, 'password-unreadable', t('errors.passwordUnreadable'))
    case 'send-failed':
      return errorResponse(502, 'send-failed', t('errors.sendFailed'))
  }
}
