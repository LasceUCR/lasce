import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const tx = {
    smtpSettings: { findUnique: vi.fn(), upsert: vi.fn() },
    auditEvent: { create: vi.fn() },
  }
  return {
    tx,
    findUnique: vi.fn(),
    serverEnv: vi.fn(),
  }
})

vi.mock('@lasce/db', () => ({
  prisma: {
    smtpSettings: { findUnique: mocks.findUnique },
    $transaction: (fn: (client: typeof mocks.tx) => unknown) => fn(mocks.tx),
  },
}))

vi.mock('@lasce/config/env', () => ({ serverEnv: mocks.serverEnv }))

import { deriveKey, encryptSecret } from '@/app/services/mail/crypto'
import {
  canStoreSmtpPassword,
  getSmtpSettingsView,
  loadSmtpTransportConfig,
  saveSmtpSettings,
} from '@/app/services/mail/smtpSettings'
import type { SmtpSettingsInput } from '@/app/lib/mail-settings'

const CRON_SECRET = 'cron-secret-de-prueba'
const key = deriveKey(CRON_SECRET)
const actor = { id: '5f0b1c9e-3d2a-4f6b-9c8d-7e6f5a4b3c2d' }

const stored = {
  host: 'smtp.ucr.ac.cr',
  port: 587,
  security: 'starttls',
  username: 'lasce',
  passwordCiphertext: encryptSecret('secreto', key),
  fromAddress: 'no-responder@ucr.ac.cr',
  fromName: 'LASCE',
}

const input: SmtpSettingsInput = {
  host: 'smtp.ucr.ac.cr',
  port: 587,
  security: 'starttls',
  username: 'lasce',
  password: '',
  fromAddress: 'no-responder@ucr.ac.cr',
  fromName: 'LASCE',
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.serverEnv.mockReturnValue({ CRON_SECRET })
})

describe('canStoreSmtpPassword', () => {
  test('is true while CRON_SECRET is available', () => {
    expect(canStoreSmtpPassword()).toBe(true)
  })

  test('is false when the environment cannot be read', () => {
    mocks.serverEnv.mockImplementation(() => {
      throw new Error('Invalid environment variables')
    })
    expect(canStoreSmtpPassword()).toBe(false)
  })
})

describe('getSmtpSettingsView', () => {
  test('is null when nothing is stored', async () => {
    mocks.findUnique.mockResolvedValue(null)
    expect(await getSmtpSettingsView()).toBeNull()
  })

  test('says a password is stored without returning it', async () => {
    mocks.findUnique.mockResolvedValue(stored)
    const view = await getSmtpSettingsView()

    expect(view).toEqual({
      host: 'smtp.ucr.ac.cr',
      port: 587,
      security: 'starttls',
      username: 'lasce',
      fromAddress: 'no-responder@ucr.ac.cr',
      fromName: 'LASCE',
      passwordConfigured: true,
      passwordUnreadable: false,
    })
    expect(JSON.stringify(view)).not.toContain(stored.passwordCiphertext)
  })

  test('flags a password that no longer decrypts after CRON_SECRET changed', async () => {
    mocks.findUnique.mockResolvedValue(stored)
    mocks.serverEnv.mockReturnValue({ CRON_SECRET: 'otro-cron-secret' })

    expect(await getSmtpSettingsView()).toMatchObject({
      passwordConfigured: true,
      passwordUnreadable: true,
    })
  })
})

describe('saveSmtpSettings', () => {
  test('creates the settings, encrypts the password and records which fields changed', async () => {
    mocks.tx.smtpSettings.findUnique.mockResolvedValue(null)

    const result = await saveSmtpSettings({ ...input, password: 'secreto' }, actor)

    expect(result).toEqual({
      ok: true,
      changed: ['host', 'port', 'security', 'username', 'fromAddress', 'fromName', 'password'],
    })
    const [{ create }] = mocks.tx.smtpSettings.upsert.mock.calls[0] as [
      { create: { passwordCiphertext: string; singleton: boolean } },
    ]
    expect(create.singleton).toBe(true)
    expect(create.passwordCiphertext).toMatch(/^v1\./)
    expect(create.passwordCiphertext).not.toContain('secreto')

    const [{ data: event }] = mocks.tx.auditEvent.create.mock.calls[0] as [
      { data: { action: string; actorId: string; metadata: unknown } },
    ]
    expect(event).toMatchObject({
      action: 'smtp_settings.update',
      actorType: 'user',
      actorId: actor.id,
      entityType: 'smtp_settings',
      metadata: {
        fields: ['host', 'port', 'security', 'username', 'fromAddress', 'fromName', 'password'],
      },
    })
    expect(JSON.stringify(event)).not.toContain('secreto')
  })

  test('keeps the stored password when the field is left empty', async () => {
    mocks.tx.smtpSettings.findUnique.mockResolvedValue(stored)

    const result = await saveSmtpSettings({ ...input, fromName: 'Portal LASCE' }, actor)

    expect(result).toEqual({ ok: true, changed: ['fromName'] })
    const [{ update }] = mocks.tx.smtpSettings.upsert.mock.calls[0] as [
      { update: { passwordCiphertext: string } },
    ]
    expect(update.passwordCiphertext).toBe(stored.passwordCiphertext)
  })

  test.each([
    ['host', { host: 'atacante.example' }],
    ['port', { port: 2525 }],
    ['security', { security: 'none' as const }],
    ['username', { username: 'otra-cuenta' }],
  ])(
    'asks for the password again when the %s changes, so it is never replayed elsewhere',
    async (_field, change) => {
      mocks.tx.smtpSettings.findUnique.mockResolvedValue(stored)

      expect(await saveSmtpSettings({ ...input, ...change }, actor)).toEqual({
        ok: false,
        reason: 'password-required',
      })
      expect(mocks.tx.smtpSettings.upsert).not.toHaveBeenCalled()
    },
  )

  test('accepts a changed host together with a newly typed password', async () => {
    mocks.tx.smtpSettings.findUnique.mockResolvedValue(stored)

    const result = await saveSmtpSettings(
      { ...input, host: 'mail.ucr.ac.cr', password: 'nuevo' },
      actor,
    )

    expect(result).toEqual({ ok: true, changed: ['host', 'password'] })
  })

  test('does not keep a stored password that no longer decrypts', async () => {
    mocks.tx.smtpSettings.findUnique.mockResolvedValue(stored)
    mocks.serverEnv.mockReturnValue({ CRON_SECRET: 'otro-cron-secret' })

    expect(await saveSmtpSettings(input, actor)).toEqual({
      ok: false,
      reason: 'password-required',
    })
  })

  test('writes and records nothing when no field changed', async () => {
    mocks.tx.smtpSettings.findUnique.mockResolvedValue(stored)

    expect(await saveSmtpSettings(input, actor)).toEqual({ ok: true, changed: [] })
    expect(mocks.tx.smtpSettings.upsert).not.toHaveBeenCalled()
    expect(mocks.tx.auditEvent.create).not.toHaveBeenCalled()
  })

  test('drops the stored password when the username is removed', async () => {
    mocks.tx.smtpSettings.findUnique.mockResolvedValue(stored)

    const result = await saveSmtpSettings({ ...input, username: null }, actor)

    expect(result).toEqual({ ok: true, changed: ['username', 'password'] })
    const [{ update }] = mocks.tx.smtpSettings.upsert.mock.calls[0] as [
      { update: { passwordCiphertext: string | null } },
    ]
    expect(update.passwordCiphertext).toBeNull()
  })

  test('asks for a password when a username has none stored', async () => {
    mocks.tx.smtpSettings.findUnique.mockResolvedValue(null)

    expect(await saveSmtpSettings(input, actor)).toEqual({
      ok: false,
      reason: 'password-required',
    })
    expect(mocks.tx.smtpSettings.upsert).not.toHaveBeenCalled()
  })

  test('refuses to store a password without CRON_SECRET', async () => {
    mocks.serverEnv.mockImplementation(() => {
      throw new Error('Invalid environment variables')
    })

    expect(await saveSmtpSettings({ ...input, password: 'secreto' }, actor)).toEqual({
      ok: false,
      reason: 'key-unavailable',
    })
    expect(mocks.tx.smtpSettings.upsert).not.toHaveBeenCalled()
  })
})

describe('loadSmtpTransportConfig', () => {
  test('reports missing settings', async () => {
    mocks.findUnique.mockResolvedValue(null)
    expect(await loadSmtpTransportConfig()).toEqual({ ok: false, reason: 'not-configured' })
  })

  test('decrypts the password for sending', async () => {
    mocks.findUnique.mockResolvedValue(stored)

    expect(await loadSmtpTransportConfig()).toEqual({
      ok: true,
      config: {
        host: 'smtp.ucr.ac.cr',
        port: 587,
        security: 'starttls',
        auth: { user: 'lasce', pass: 'secreto' },
        from: { name: 'LASCE', address: 'no-responder@ucr.ac.cr' },
      },
    })
  })

  test('sends without authentication when no username is stored', async () => {
    mocks.findUnique.mockResolvedValue({ ...stored, username: null, passwordCiphertext: null })
    const result = await loadSmtpTransportConfig()
    expect(result.ok && result.config.auth).toBeNull()
  })

  test('treats a username without a password as not configured', async () => {
    mocks.findUnique.mockResolvedValue({ ...stored, passwordCiphertext: null })
    expect(await loadSmtpTransportConfig()).toEqual({ ok: false, reason: 'not-configured' })
  })

  test('reports a password that no longer decrypts', async () => {
    mocks.findUnique.mockResolvedValue(stored)
    mocks.serverEnv.mockReturnValue({ CRON_SECRET: 'otro-cron-secret' })

    expect(await loadSmtpTransportConfig()).toEqual({ ok: false, reason: 'password-unreadable' })
  })

  test('narrows an unexpected security value to STARTTLS', async () => {
    mocks.findUnique.mockResolvedValue({ ...stored, security: 'ssl' })
    const result = await loadSmtpTransportConfig()
    expect(result.ok && result.config.security).toBe('starttls')
  })
})
