import { sendMail } from '@/app/services/mail/mailer'

import {
  RATE_LIMIT_PREFIX,
  consumeRateLimits,
  type RateLimitRedis,
  type RateLimitRule,
} from '../rate-limit'
import { RESET_TOKEN_TTL_MINUTES } from './password-reset'
import { issuePasswordResetToken } from './password-reset-store'
import { emailRateLimitKey, resetLink } from './password-reset-token'

/**
 * What happens after a visitor asks for a reset link (LASCE-CON-0012-448). The Server Action
 * answers every valid address with the same confirmation at once and runs this afterwards, so
 * neither the answer nor its timing depends on whether the address has an account, whether it was
 * rate limited, or whether the email went out. Server-only.
 */

/** About five requests per quarter hour from one address, and three per hour for one account. */
export const PASSWORD_RESET_LIMITS = {
  perIp: { limit: 5, windowSeconds: 15 * 60 },
  perEmail: { limit: 3, windowSeconds: 60 * 60 },
} as const

/**
 * The windows a request counts against. The address is keyed by its hash, never in clear. Without
 * a client IP (no proxy header) only the per-address window applies.
 */
export function passwordResetRateLimitRules(email: string, ip: string | null): RateLimitRule[] {
  const prefix = `${RATE_LIMIT_PREFIX}:password-reset`
  const rules: RateLimitRule[] = [
    { key: `${prefix}:email:${emailRateLimitKey(email)}`, ...PASSWORD_RESET_LIMITS.perEmail },
  ]
  if (ip) rules.unshift({ key: `${prefix}:ip:${ip}`, ...PASSWORD_RESET_LIMITS.perIp })
  return rules
}

/**
 * The client's address as the reverse proxy reports it: the first `X-Forwarded-For` entry, else
 * `X-Real-IP`. Behind Traefik these are set by the proxy. Without one the header can be forged,
 * which only changes the IP window; the per-account window still holds.
 */
export function clientIp(headers: { get(name: string): string | null }): string | null {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = forwarded || headers.get('x-real-ip')?.trim()
  return ip && /^[0-9A-Fa-f:.]{2,45}$/.test(ip) ? ip : null
}

/** The keys of `auth.passwordReset.email` in the message catalogues. */
export type PasswordResetEmailKey =
  'subject' | 'greeting' | 'intro' | 'action' | 'linkFallback' | 'expiry' | 'ignore' | 'signature'

export type PasswordResetEmailTranslator = (
  key: PasswordResetEmailKey,
  values?: { name?: string; minutes?: number },
) => string

export interface ResetEmail {
  subject: string
  text: string
  html: string
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/**
 * The email, in plain text and HTML, in the language `t` speaks. The account's name is user input,
 * so it is escaped in the HTML part.
 */
export function buildPasswordResetEmail(
  t: PasswordResetEmailTranslator,
  { name, link }: { name: string; link: string },
): ResetEmail {
  const greeting = t('greeting', { name })
  const expiry = t('expiry', { minutes: RESET_TOKEN_TTL_MINUTES })
  const text = [
    greeting,
    '',
    t('intro'),
    '',
    `${t('action')}: ${link}`,
    '',
    expiry,
    t('ignore'),
    '',
    t('signature'),
  ].join('\n')

  const safeLink = escapeHtml(link)
  const html = [
    '<!doctype html>',
    '<html><body style="font-family: Arial, sans-serif; color: #1f2933; line-height: 1.5;">',
    `<p>${escapeHtml(greeting)}</p>`,
    `<p>${escapeHtml(t('intro'))}</p>`,
    `<p><a href="${safeLink}" style="display: inline-block; padding: 10px 18px; background: #00539b; color: #ffffff; text-decoration: none; border-radius: 6px;">${escapeHtml(t('action'))}</a></p>`,
    `<p>${escapeHtml(t('linkFallback'))}<br><a href="${safeLink}">${safeLink}</a></p>`,
    `<p>${escapeHtml(expiry)}</p>`,
    `<p>${escapeHtml(t('ignore'))}</p>`,
    `<p>${escapeHtml(t('signature'))}</p>`,
    '</body></html>',
  ].join('\n')

  return { subject: t('subject'), text, html }
}

export type PasswordResetRequestOutcome = 'sent' | 'rate-limited' | 'unknown-account' | 'not-sent'

export interface PasswordResetRequest {
  /** Already validated and normalised by the request schema. */
  email: string
  ip: string | null
  /** The site's public origin, which the link points at. */
  origin: URL | string
  t: PasswordResetEmailTranslator
  redis: RateLimitRedis
}

/**
 * Counts the request against the rate limits, issues a token for a registered address and emails
 * the link. Never throws for an expected outcome; the outcome is returned for logging and tests and
 * is never shown to the visitor. Logs carry no address and no token.
 */
export async function processPasswordResetRequest({
  email,
  ip,
  origin,
  t,
  redis,
}: PasswordResetRequest): Promise<PasswordResetRequestOutcome> {
  if (!(await consumeRateLimits(redis, passwordResetRateLimitRules(email, ip)))) {
    console.warn('[password-reset] request rate limited; no email sent.')
    return 'rate-limited'
  }

  const issued = await issuePasswordResetToken(email)
  if (!issued) return 'unknown-account'

  const message = buildPasswordResetEmail(t, {
    name: issued.user.fullName,
    link: resetLink(origin, issued.token),
  })
  const result = await sendMail({ to: issued.user.email, ...message })
  if (!result.ok) {
    console.error(`[password-reset] reset email not sent (${result.reason}).`)
    return 'not-sent'
  }
  return 'sent'
}
