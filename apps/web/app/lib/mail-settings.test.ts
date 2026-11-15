import { describe, expect, test } from 'vitest'

import {
  SMTP_PASSWORD_MAX_LENGTH,
  getSmtpSettingsSchema,
  isSmtpSecurity,
  smtpSettingsFormValues,
  smtpSettingsMessages,
  validateSmtpSettings,
  type SmtpSettingsFormValues,
} from './mail-settings'

const valid: SmtpSettingsFormValues = {
  host: ' smtp.ucr.ac.cr ',
  port: '587',
  security: 'starttls',
  username: ' lasce ',
  password: ' secreto ',
  fromAddress: ' No-Responder@UCR.ac.cr ',
  fromName: ' LASCE ',
}

describe('SMTP settings validation', () => {
  test('normalises valid settings into what the service stores', () => {
    expect(validateSmtpSettings(valid)).toEqual({
      ok: true,
      data: {
        host: 'smtp.ucr.ac.cr',
        port: 587,
        security: 'starttls',
        username: 'lasce',
        // Passwords keep their spaces.
        password: ' secreto ',
        fromAddress: 'No-Responder@UCR.ac.cr',
        fromName: 'LASCE',
      },
    })
  })

  test('accepts a numeric port and turns an empty username into no authentication', () => {
    const result = validateSmtpSettings({ ...valid, port: 1025, username: '', password: '' })
    expect(result.ok && result.data.port).toBe(1025)
    expect(result.ok && result.data.username).toBeNull()
  })

  test('reports every empty required field with its own message', () => {
    expect(
      validateSmtpSettings({
        host: '',
        port: '',
        security: '',
        username: '',
        password: '',
        fromAddress: '',
        fromName: '',
      }),
    ).toEqual({
      ok: false,
      fieldErrors: {
        host: smtpSettingsMessages.hostRequired,
        port: smtpSettingsMessages.portInvalid,
        security: smtpSettingsMessages.securityRequired,
        fromAddress: smtpSettingsMessages.fromAddressRequired,
        fromName: smtpSettingsMessages.fromNameRequired,
      },
    })
  })

  test('rejects malformed values', () => {
    const result = validateSmtpSettings({
      ...valid,
      host: 'smtp://ucr.ac.cr/',
      port: '70000',
      security: 'ssl',
      password: 'a'.repeat(SMTP_PASSWORD_MAX_LENGTH + 1),
      fromAddress: 'no es un correo',
    })
    expect(result).toEqual({
      ok: false,
      fieldErrors: {
        host: smtpSettingsMessages.hostInvalid,
        port: smtpSettingsMessages.portInvalid,
        security: smtpSettingsMessages.securityRequired,
        password: smtpSettingsMessages.passwordTooLong,
        fromAddress: smtpSettingsMessages.fromAddressInvalid,
      },
    })
  })

  test('rejects a port that is not a whole number', () => {
    for (const port of ['25.5', 'abc', '0']) {
      expect(validateSmtpSettings({ ...valid, port })).toEqual({
        ok: false,
        fieldErrors: { port: smtpSettingsMessages.portInvalid },
      })
    }
  })

  test('uses the messages of the schema it is given', () => {
    const schema = getSmtpSettingsSchema({ ...smtpSettingsMessages, hostRequired: 'Enter it.' })
    expect(validateSmtpSettings({ ...valid, host: '' }, schema)).toEqual({
      ok: false,
      fieldErrors: { host: 'Enter it.' },
    })
  })

  test('recognises the three security modes only', () => {
    expect(['tls', 'starttls', 'none'].every(isSmtpSecurity)).toBe(true)
    expect(isSmtpSecurity('ssl')).toBe(false)
    expect(isSmtpSecurity(undefined)).toBe(false)
  })
})

describe('smtpSettingsFormValues', () => {
  test('starts empty when nothing is stored', () => {
    expect(smtpSettingsFormValues(null)).toEqual({
      host: '',
      port: '',
      security: '',
      username: '',
      password: '',
      fromAddress: '',
      fromName: '',
    })
  })

  test('fills the stored settings and never a password', () => {
    expect(
      smtpSettingsFormValues({
        host: 'smtp.ucr.ac.cr',
        port: 465,
        security: 'tls',
        username: null,
        fromAddress: 'lasce@ucr.ac.cr',
        fromName: 'LASCE',
        passwordConfigured: true,
        passwordUnreadable: false,
      }),
    ).toEqual({
      host: 'smtp.ucr.ac.cr',
      port: '465',
      security: 'tls',
      username: '',
      password: '',
      fromAddress: 'lasce@ucr.ac.cr',
      fromName: 'LASCE',
    })
  })
})
