import { createTranslator } from 'next-intl'
import { afterEach, describe, expect, test, vi } from 'vitest'

import es from '@/messages/es.json' with { type: 'json' }

const mocks = vi.hoisted(() => ({
  requireApiPermission: vi.fn(),
  saveSmtpSettings: vi.fn(),
  sendMail: vi.fn(),
}))

vi.mock('@/app/lib/auth/apiGuard', () => ({ requireApiPermission: mocks.requireApiPermission }))
vi.mock('@/app/services/mail/smtpSettings', () => ({ saveSmtpSettings: mocks.saveSmtpSettings }))
vi.mock('@/app/services/mail/mailer', () => ({ sendMail: mocks.sendMail }))
// The route reads its messages from the request; here they come from the real Spanish catalogue.
vi.mock('next-intl/server', () => ({
  getMessages: async () => es,
  getTranslations: async (namespace: string) =>
    createTranslator({ locale: 'es', messages: es, namespace: namespace as never }),
}))

import { PUT } from './route'
import { POST } from './test/route'

const admin = { id: '5f0b1c9e-3d2a-4f6b-9c8d-7e6f5a4b3c2d', email: 'admin@ucr.ac.cr' }
const errors = es.administration.email.errors

const body = {
  host: 'smtp.ucr.ac.cr',
  port: '587',
  security: 'starttls',
  username: 'lasce',
  password: 'secreto',
  fromAddress: 'no-responder@ucr.ac.cr',
  fromName: 'LASCE',
}

function put(payload: unknown) {
  return PUT(
    new Request('http://localhost/api/email-settings', {
      method: 'PUT',
      body: typeof payload === 'string' ? payload : JSON.stringify(payload),
    }),
  )
}

function allow() {
  mocks.requireApiPermission.mockResolvedValue({ ok: true, user: admin })
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('PUT /api/email-settings', () => {
  test('requires the manage_email_settings grant', async () => {
    mocks.requireApiPermission.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: 'denied' }), { status: 403 }),
    })

    const response = await put(body)

    expect(response.status).toBe(403)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('manage_email_settings')
    expect(mocks.saveSmtpSettings).not.toHaveBeenCalled()
  })

  test('saves valid settings as the signed-in administrator', async () => {
    allow()
    mocks.saveSmtpSettings.mockResolvedValue({ ok: true, changed: ['host', 'password'] })

    const response = await put(body)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ changed: ['host', 'password'] })
    expect(mocks.saveSmtpSettings).toHaveBeenCalledWith(
      expect.objectContaining({ port: 587, password: 'secreto' }),
      admin,
    )
  })

  test('answers invalid fields with their messages', async () => {
    allow()

    const response = await put({ ...body, host: '', port: 'x' })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: errors.invalid,
      issues: [
        { path: 'host', message: es.administration.email.validation.hostRequired },
        { path: 'port', message: es.administration.email.validation.portInvalid },
      ],
    })
    expect(mocks.saveSmtpSettings).not.toHaveBeenCalled()
  })

  test('rejects a body that is not JSON', async () => {
    allow()
    expect((await put('{')).status).toBe(400)
  })

  test('explains why a password cannot be stored or is missing', async () => {
    allow()
    mocks.saveSmtpSettings.mockResolvedValueOnce({ ok: false, reason: 'key-unavailable' })
    const unavailable = await put(body)
    expect(unavailable.status).toBe(409)
    expect(await unavailable.json()).toMatchObject({ error: errors.keyUnavailable })

    mocks.saveSmtpSettings.mockResolvedValueOnce({ ok: false, reason: 'password-required' })
    const missing = await put({ ...body, password: '' })
    expect(missing.status).toBe(400)
    expect(await missing.json()).toMatchObject({ error: errors.passwordRequired })
  })

  test('hides database failures behind a generic message', async () => {
    allow()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.saveSmtpSettings.mockRejectedValue(new Error('relation "smtp_settings" does not exist'))

    const response = await put(body)

    expect(response.status).toBe(500)
    expect(JSON.stringify(await response.json())).not.toContain('relation')
  })
})

describe('POST /api/email-settings/test', () => {
  test('requires the manage_email_settings grant', async () => {
    mocks.requireApiPermission.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: 'denied' }), { status: 401 }),
    })

    expect((await POST()).status).toBe(401)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('manage_email_settings')
    expect(mocks.sendMail).not.toHaveBeenCalled()
  })

  test('sends the test message to the administrator only', async () => {
    allow()
    mocks.sendMail.mockResolvedValue({ ok: true })

    const response = await POST()

    expect(response.status).toBe(200)
    expect(mocks.sendMail).toHaveBeenCalledWith({
      to: admin.email,
      subject: es.administration.email.testEmail.subject,
      text: es.administration.email.testEmail.body,
    })
  })

  test.each([
    ['not-configured', 409, errors.notConfigured],
    ['password-unreadable', 409, errors.passwordUnreadable],
    ['send-failed', 502, errors.sendFailed],
  ])('answers %s with what to check', async (reason, status, message) => {
    allow()
    mocks.sendMail.mockResolvedValue({ ok: false, reason })

    const response = await POST()

    expect(response.status).toBe(status)
    expect(await response.json()).toMatchObject({ error: message, code: reason })
  })
})
