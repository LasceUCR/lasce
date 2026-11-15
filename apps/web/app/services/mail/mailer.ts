import { createTransport } from 'nodemailer'

import { loadSmtpTransportConfig, type SmtpTransportConfig } from './smtpSettings'

/**
 * Sends one email through the SMTP server an administrator configured on
 * `/administracion/correo`. It never throws: the result says what went wrong in terms a caller can
 * branch on, and the details (host errors, SMTP replies) go to the server log only, because a
 * visitor must never see them.
 */

export interface MailMessage {
  to: string
  subject: string
  text: string
  html?: string
}

export type SendMailFailure = 'not-configured' | 'password-unreadable' | 'send-failed'

export type SendMailResult = { ok: true } | { ok: false; reason: SendMailFailure }

/** Short enough that a dead server fails a request in seconds rather than hanging it. */
const CONNECTION_TIMEOUT_MS = 10_000
const SOCKET_TIMEOUT_MS = 20_000

/** nodemailer options for `config`. Exported for its tests. */
export function transportOptions(config: SmtpTransportConfig) {
  return {
    host: config.host,
    port: config.port,
    // `secure` is implicit TLS from the first byte; STARTTLS upgrades a plain connection and
    // `requireTLS` refuses to continue when the server does not offer it.
    secure: config.security === 'tls',
    requireTLS: config.security === 'starttls',
    ignoreTLS: config.security === 'none',
    ...(config.auth ? { auth: { user: config.auth.user, pass: config.auth.pass } } : {}),
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    greetingTimeout: CONNECTION_TIMEOUT_MS,
    socketTimeout: SOCKET_TIMEOUT_MS,
  }
}

export async function sendMail(message: MailMessage): Promise<SendMailResult> {
  let loaded
  try {
    loaded = await loadSmtpTransportConfig()
  } catch (error) {
    console.error('[mail] reading the SMTP settings failed:', messageOf(error))
    return { ok: false, reason: 'send-failed' }
  }

  if (!loaded.ok) {
    console.warn(
      loaded.reason === 'password-unreadable'
        ? '[mail] the stored SMTP password cannot be decrypted (was CRON_SECRET rotated?); not sending.'
        : '[mail] SMTP is not configured; not sending.',
    )
    return { ok: false, reason: loaded.reason }
  }

  const { config } = loaded
  const transport = createTransport(transportOptions(config))
  try {
    await transport.sendMail({
      from: { name: config.from.name, address: config.from.address },
      to: message.to,
      subject: message.subject,
      text: message.text,
      ...(message.html ? { html: message.html } : {}),
    })
    return { ok: true }
  } catch (error) {
    // The SMTP error, never the message or its recipient.
    console.error('[mail] sending failed:', messageOf(error))
    return { ok: false, reason: 'send-failed' }
  } finally {
    transport.close()
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
