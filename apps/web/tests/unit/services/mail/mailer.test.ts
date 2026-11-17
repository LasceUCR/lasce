import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn(),
  close: vi.fn(),
  findUnique: vi.fn(),
}))

vi.mock('nodemailer', () => ({ createTransport: mocks.createTransport }))

vi.mock('@lasce/db', () => ({ prisma: { smtpSettings: { findUnique: mocks.findUnique } } }))

vi.mock('@lasce/config/env', () => ({
  serverEnv: () => ({ CRON_SECRET: 'cron-secret-de-prueba' }),
}))

import { deriveKey, encryptSecret } from '@/app/services/mail/crypto'
import { sendMail, transportOptions } from '@/app/services/mail/mailer'

const stored = {
  host: 'smtp.ucr.ac.cr',
  port: 587,
  security: 'starttls',
  username: 'lasce',
  passwordCiphertext: encryptSecret('secreto', deriveKey('cron-secret-de-prueba')),
  fromAddress: 'no-responder@ucr.ac.cr',
  fromName: 'LASCE',
}

const message = {
  to: 'ana@ucr.ac.cr',
  subject: 'Asunto',
  text: 'Texto',
  html: '<p>Texto</p>',
}

beforeEach(() => {
  mocks.createTransport.mockReturnValue({ sendMail: mocks.sendMail, close: mocks.close })
  mocks.sendMail.mockResolvedValue({ messageId: 'id' })
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('transportOptions', () => {
  const base = {
    host: 'smtp.ucr.ac.cr',
    port: 465,
    auth: null,
    from: { name: 'LASCE', address: 'lasce@ucr.ac.cr' },
  }

  test('maps each security mode to the matching TLS options', () => {
    expect(transportOptions({ ...base, security: 'tls' })).toMatchObject({
      secure: true,
      requireTLS: false,
      ignoreTLS: false,
    })
    expect(transportOptions({ ...base, security: 'starttls' })).toMatchObject({
      secure: false,
      requireTLS: true,
      ignoreTLS: false,
    })
    expect(transportOptions({ ...base, security: 'none' })).toMatchObject({
      secure: false,
      requireTLS: false,
      ignoreTLS: true,
    })
  })

  test('adds credentials only when there are some and always bounds the wait', () => {
    expect(transportOptions({ ...base, security: 'tls' })).not.toHaveProperty('auth')
    const options = transportOptions({
      ...base,
      security: 'tls',
      auth: { user: 'u', pass: 'p' },
    })
    expect(options.auth).toEqual({ user: 'u', pass: 'p' })
    expect(options.connectionTimeout).toBeGreaterThan(0)
    expect(options.socketTimeout).toBeGreaterThan(0)
  })
})

describe('sendMail', () => {
  test('sends through the stored server with the decrypted password', async () => {
    mocks.findUnique.mockResolvedValue(stored)

    expect(await sendMail(message)).toEqual({ ok: true })
    expect(mocks.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.ucr.ac.cr',
        port: 587,
        requireTLS: true,
        auth: { user: 'lasce', pass: 'secreto' },
      }),
    )
    expect(mocks.sendMail).toHaveBeenCalledWith({
      from: { name: 'LASCE', address: 'no-responder@ucr.ac.cr' },
      to: 'ana@ucr.ac.cr',
      subject: 'Asunto',
      text: 'Texto',
      html: '<p>Texto</p>',
    })
    expect(mocks.close).toHaveBeenCalled()
  })

  test('does not connect when SMTP is not configured', async () => {
    mocks.findUnique.mockResolvedValue(null)

    expect(await sendMail(message)).toEqual({ ok: false, reason: 'not-configured' })
    expect(mocks.createTransport).not.toHaveBeenCalled()
  })

  test('does not connect when the stored password cannot be decrypted', async () => {
    mocks.findUnique.mockResolvedValue({ ...stored, passwordCiphertext: 'v1.a.b.c' })

    expect(await sendMail(message)).toEqual({ ok: false, reason: 'password-unreadable' })
    expect(mocks.createTransport).not.toHaveBeenCalled()
  })

  test('reports a refused message and logs the SMTP error, not the message', async () => {
    mocks.findUnique.mockResolvedValue(stored)
    mocks.sendMail.mockRejectedValue(new Error('535 Authentication failed'))

    expect(await sendMail(message)).toEqual({ ok: false, reason: 'send-failed' })
    expect(console.error).toHaveBeenCalledWith(
      '[mail] sending failed:',
      '535 Authentication failed',
    )
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('ana@ucr.ac.cr')
    expect(mocks.close).toHaveBeenCalled()
  })

  test('reports a database failure as a failed send', async () => {
    mocks.findUnique.mockRejectedValue(new Error('connection refused'))

    expect(await sendMail(message)).toEqual({ ok: false, reason: 'send-failed' })
  })

  test('sends plain text alone when there is no HTML', async () => {
    mocks.findUnique.mockResolvedValue(stored)

    await sendMail({ to: message.to, subject: message.subject, text: message.text })
    expect(mocks.sendMail.mock.calls[0]?.[0]).not.toHaveProperty('html')
  })
})
