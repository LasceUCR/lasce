import { serverEnv } from '@lasce/config/env'
import { prisma } from '@lasce/db'

import { recordUserAuditEvent, type AuditActor } from '@/app/lib/audit-log'
import {
  isSmtpSecurity,
  type SmtpSecurity,
  type SmtpSettingsField,
  type SmtpSettingsInput,
  type SmtpSettingsView,
} from '@/app/lib/mail-settings'

import { decryptSecret, deriveKey, encryptSecret } from './crypto'

/**
 * Storage of the SMTP settings (`public.smtp_settings`, one row at most). The password is
 * encrypted on write and decrypted only when a message is about to be sent; nothing here ever
 * returns it to a caller that renders, and the audit event names the fields that changed, never
 * their values. See `docs/password-reset.md`.
 */

const SINGLETON = { singleton: true } as const

const storedSelect = {
  host: true,
  port: true,
  security: true,
  username: true,
  passwordCiphertext: true,
  fromAddress: true,
  fromName: true,
} as const

interface StoredSmtpSettings {
  host: string
  port: number
  security: string
  username: string | null
  passwordCiphertext: string | null
  fromAddress: string
  fromName: string
}

/**
 * The key that encrypts the stored password, derived from `CRON_SECRET`, or `null` when the
 * environment has no usable secret. Without it a password can be neither saved nor read.
 */
export function smtpEncryptionKey(): Buffer | null {
  let secret: string
  try {
    secret = serverEnv().CRON_SECRET
  } catch {
    return null
  }
  return secret ? deriveKey(secret) : null
}

/** Whether a new SMTP password can be stored right now. */
export function canStoreSmtpPassword(): boolean {
  return smtpEncryptionKey() !== null
}

function readPassword(ciphertext: string, key: Buffer | null): string | null {
  if (!key) return null
  try {
    return decryptSecret(ciphertext, key)
  } catch {
    return null
  }
}

function securityOf(value: string): SmtpSecurity {
  // The CHECK constraint keeps other values out; this only narrows the type.
  return isSmtpSecurity(value) ? value : 'starttls'
}

function readStored(): Promise<StoredSmtpSettings | null> {
  return prisma.smtpSettings.findUnique({ where: SINGLETON, select: storedSelect })
}

/** What the Correo page shows: the stored settings without the password, or `null`. */
export async function getSmtpSettingsView(): Promise<SmtpSettingsView | null> {
  const stored = await readStored()
  if (!stored) return null

  const passwordConfigured = stored.passwordCiphertext !== null
  return {
    host: stored.host,
    port: stored.port,
    security: securityOf(stored.security),
    username: stored.username,
    fromAddress: stored.fromAddress,
    fromName: stored.fromName,
    passwordConfigured,
    passwordUnreadable:
      passwordConfigured &&
      readPassword(stored.passwordCiphertext ?? '', smtpEncryptionKey()) === null,
  }
}

export type SaveSmtpSettingsResult =
  | { ok: true; changed: SmtpSettingsField[] }
  | { ok: false; reason: 'key-unavailable' | 'password-required' }

const PLAIN_FIELDS = ['host', 'port', 'security', 'username', 'fromAddress', 'fromName'] as const

/** The fields that decide where, and how, the stored password is sent. */
const CONNECTION_FIELDS = ['host', 'port', 'security', 'username'] as const

/**
 * Saves the settings and records `smtp_settings.update` in the same transaction. An empty
 * `password` keeps the stored one, but only for the same server, port, security mode and user,
 * and only while it still decrypts: otherwise a changed host (or a downgrade to no encryption)
 * would replay the saved credential somewhere new, so the password has to be typed again. An
 * empty `username` means no authentication and drops any stored password. Nothing is written,
 * and nothing recorded, when no field changed.
 */
export async function saveSmtpSettings(
  input: SmtpSettingsInput,
  actor: AuditActor,
): Promise<SaveSmtpSettingsResult> {
  const key = smtpEncryptionKey()
  if (input.username !== null && input.password !== '' && !key) {
    return { ok: false, reason: 'key-unavailable' }
  }

  return prisma.$transaction(async (tx): Promise<SaveSmtpSettingsResult> => {
    const existing = await tx.smtpSettings.findUnique({ where: SINGLETON, select: storedSelect })

    let passwordCiphertext: string | null
    if (input.username === null) {
      passwordCiphertext = null
    } else if (input.password !== '' && key) {
      passwordCiphertext = encryptSecret(input.password, key)
    } else if (
      existing?.passwordCiphertext &&
      CONNECTION_FIELDS.every((field) => existing[field] === input[field]) &&
      readPassword(existing.passwordCiphertext, key) !== null
    ) {
      passwordCiphertext = existing.passwordCiphertext
    } else {
      passwordCiphertext = null
    }
    if (input.username !== null && passwordCiphertext === null) {
      return { ok: false, reason: 'password-required' }
    }

    const data = {
      host: input.host,
      port: input.port,
      security: input.security,
      username: input.username,
      passwordCiphertext,
      fromAddress: input.fromAddress,
      fromName: input.fromName,
    }

    const changed: SmtpSettingsField[] = PLAIN_FIELDS.filter(
      (field) => !existing || existing[field] !== data[field],
    )
    if (existing?.passwordCiphertext !== passwordCiphertext) changed.push('password')
    if (changed.length === 0) return { ok: true, changed }

    await tx.smtpSettings.upsert({
      where: SINGLETON,
      create: { ...SINGLETON, ...data },
      update: { ...data, updatedAt: new Date() },
    })
    await recordUserAuditEvent(tx, actor, {
      action: 'smtp_settings.update',
      summary: 'Configuración de correo actualizada',
      entityType: 'smtp_settings',
      metadata: { fields: changed },
    })
    return { ok: true, changed }
  })
}

/** Everything a transport needs to send one message, password decrypted. Server-only. */
export interface SmtpTransportConfig {
  host: string
  port: number
  security: SmtpSecurity
  auth: { user: string; pass: string } | null
  from: { name: string; address: string }
}

export type LoadSmtpConfigResult =
  | { ok: true; config: SmtpTransportConfig }
  | { ok: false; reason: 'not-configured' | 'password-unreadable' }

/**
 * The settings to send with, or why there are none. A password that no longer decrypts (a
 * rotated `CRON_SECRET`, a missing one) counts as not configured for sending.
 */
export async function loadSmtpTransportConfig(): Promise<LoadSmtpConfigResult> {
  const stored = await readStored()
  if (!stored) return { ok: false, reason: 'not-configured' }

  let auth: SmtpTransportConfig['auth'] = null
  if (stored.username !== null) {
    if (stored.passwordCiphertext === null) return { ok: false, reason: 'not-configured' }
    const pass = readPassword(stored.passwordCiphertext, smtpEncryptionKey())
    if (pass === null) return { ok: false, reason: 'password-unreadable' }
    auth = { user: stored.username, pass }
  }

  return {
    ok: true,
    config: {
      host: stored.host,
      port: stored.port,
      security: securityOf(stored.security),
      auth,
      from: { name: stored.fromName, address: stored.fromAddress },
    },
  }
}
