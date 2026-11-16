import { createTranslator } from 'next-intl'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import en from '@/messages/en.json' with { type: 'json' }
import es from '@/messages/es.json' with { type: 'json' }

const mocks = vi.hoisted(() => ({
  issuePasswordResetToken: vi.fn(),
  sendMail: vi.fn(),
}))

vi.mock('./password-reset-store', () => ({
  issuePasswordResetToken: mocks.issuePasswordResetToken,
}))
vi.mock('@/app/services/mail/mailer', () => ({ sendMail: mocks.sendMail }))

const {
  PASSWORD_RESET_LIMITS,
  buildPasswordResetEmail,
  clientIp,
  passwordResetRateLimitRules,
  processPasswordResetRequest,
} = await import('./password-reset-request')
const { emailRateLimitKey } = await import('./password-reset-token')

const tEs = createTranslator({ locale: 'es', messages: es, namespace: 'auth.passwordReset.email' })
const tEn = createTranslator({ locale: 'en', messages: en, namespace: 'auth.passwordReset.email' })

const token = 'A'.repeat(43)
const user = { id: 'user-1', fullName: 'Ana <Pérez>', email: 'ana@ucr.ac.cr' }

function redisAllowing(allowed: boolean) {
  return { eval: vi.fn().mockResolvedValue(allowed ? 1 : 99) }
}

function request(overrides: Partial<Parameters<typeof processPasswordResetRequest>[0]> = {}) {
  return processPasswordResetRequest({
    email: user.email,
    ip: '203.0.113.7',
    origin: new URL('https://lasce.ucr.ac.cr'),
    t: tEs,
    redis: redisAllowing(true),
    ...overrides,
  })
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mocks.sendMail.mockResolvedValue({ ok: true })
})

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('passwordResetRateLimitRules', () => {
  test('limits each client address and each account, keyed by a hash of the address', () => {
    expect(passwordResetRateLimitRules('ana@ucr.ac.cr', '203.0.113.7')).toEqual([
      { key: 'lasce:rate:password-reset:ip:203.0.113.7', limit: 5, windowSeconds: 900 },
      {
        key: `lasce:rate:password-reset:email:${emailRateLimitKey('ana@ucr.ac.cr')}`,
        limit: 3,
        windowSeconds: 3600,
      },
    ])
    expect(PASSWORD_RESET_LIMITS.perEmail.limit).toBe(3)
  })

  test('keeps the account window when the client address is unknown', () => {
    expect(passwordResetRateLimitRules('ana@ucr.ac.cr', null)).toHaveLength(1)
  })
})

describe('clientIp', () => {
  const headers = (values: Record<string, string>) => new Headers(values)

  test('prefers the real IP header, else the address the nearest proxy appended', () => {
    expect(
      clientIp(headers({ 'x-real-ip': '2001:db8::1', 'x-forwarded-for': '198.51.100.1' })),
    ).toBe('2001:db8::1')
    expect(clientIp(headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe('10.0.0.1')
  })

  test('never trusts an address the client put first in X-Forwarded-For', () => {
    expect(clientIp(headers({ 'x-forwarded-for': '1.2.3.4, 203.0.113.7' }))).toBe('203.0.113.7')
  })

  test('ignores a missing or malformed address', () => {
    expect(clientIp(headers({}))).toBeNull()
    expect(clientIp(headers({ 'x-forwarded-for': 'not an ip; DROP' }))).toBeNull()
  })
})

describe('buildPasswordResetEmail', () => {
  const link = `https://lasce.ucr.ac.cr/restablecer-contrasena?token=${token}`

  test('writes the link, its expiry and the warning in Spanish', () => {
    const email = buildPasswordResetEmail(tEs, { name: 'Ana', link })

    expect(email.subject).toBe(es.auth.passwordReset.email.subject)
    expect(email.text).toContain('Hola, Ana:')
    expect(email.text).toContain(link)
    expect(email.text).toContain('El enlace vence en 30 minutos')
    expect(email.text).toContain(es.auth.passwordReset.email.ignore)
    expect(email.html).toContain(`href="${link}"`)
  })

  test('follows the language of the translator it is given', () => {
    const email = buildPasswordResetEmail(tEn, { name: 'Ana', link })
    expect(email.subject).toBe('Reset your LASCE portal password')
    expect(email.text).toContain('The link expires in 30 minutes')
  })

  test('escapes the account name in the HTML part', () => {
    const email = buildPasswordResetEmail(tEs, { name: '<script>x</script>', link })
    expect(email.html).not.toContain('<script>')
    expect(email.html).toContain('&lt;script&gt;')
  })
})

describe('processPasswordResetRequest', () => {
  test('emails a registered account a link on the configured origin', async () => {
    mocks.issuePasswordResetToken.mockResolvedValue({ token, user })

    expect(await request()).toBe('sent')
    expect(mocks.issuePasswordResetToken).toHaveBeenCalledWith(user.email)
    const [message] = mocks.sendMail.mock.calls[0] as [{ to: string; text: string; html: string }]
    expect(message.to).toBe(user.email)
    expect(message.text).toContain(`https://lasce.ucr.ac.cr/restablecer-contrasena?token=${token}`)
    expect(message.html).toContain('Ana &lt;Pérez&gt;')
  })

  test('sends nothing to an address without an account', async () => {
    mocks.issuePasswordResetToken.mockResolvedValue(null)

    expect(await request({ email: 'nadie@ucr.ac.cr' })).toBe('unknown-account')
    expect(mocks.sendMail).not.toHaveBeenCalled()
  })

  test('issues no token once a rate limit is exceeded', async () => {
    expect(await request({ redis: redisAllowing(false) })).toBe('rate-limited')
    expect(mocks.issuePasswordResetToken).not.toHaveBeenCalled()
    expect(mocks.sendMail).not.toHaveBeenCalled()
  })

  test('logs a failed delivery without the address or the token', async () => {
    mocks.issuePasswordResetToken.mockResolvedValue({ token, user })
    mocks.sendMail.mockResolvedValue({ ok: false, reason: 'not-configured' })

    expect(await request()).toBe('not-sent')
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls)
    expect(logged).toContain('not-configured')
    expect(logged).not.toContain(user.email)
    expect(logged).not.toContain(token)
  })
})
