import { describe, expect, test } from 'vitest'

import { checkIntegrationDatabase } from '../../integration/guard'

const TEST_URL = 'postgresql://lasce:secret@localhost:5432/lasce_test'

describe('checkIntegrationDatabase', () => {
  test('accepts a local database whose name ends in _test', () => {
    expect(checkIntegrationDatabase({ INTEGRATION_DATABASE_URL: TEST_URL })).toEqual({
      ok: true,
      url: TEST_URL,
    })
    expect(
      checkIntegrationDatabase({
        INTEGRATION_DATABASE_URL: 'postgres://u:p@127.0.0.1:5433/publications_test',
      }).ok,
    ).toBe(true)
  })

  test('never falls back to DATABASE_URL', () => {
    const result = checkIntegrationDatabase({ DATABASE_URL: TEST_URL })

    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('not set') })
  })

  test.each([
    ['the development database', 'postgresql://lasce:lasce@localhost:5432/lasce'],
    ['a name that only contains test', 'postgresql://u:p@localhost/test_lasce'],
    ['a staging-looking name', 'postgresql://u:p@localhost/lasce_staging'],
  ])('refuses %s', (_case, url) => {
    expect(checkIntegrationDatabase({ INTEGRATION_DATABASE_URL: url })).toMatchObject({
      ok: false,
      reason: expect.stringContaining('_test'),
    })
  })

  test('refuses a remote host unless it is named explicitly', () => {
    const url = 'postgresql://u:p@db.example.com:5432/lasce_test'

    expect(checkIntegrationDatabase({ INTEGRATION_DATABASE_URL: url })).toMatchObject({
      ok: false,
      reason: expect.stringContaining('db.example.com'),
    })
    expect(
      checkIntegrationDatabase({
        INTEGRATION_DATABASE_URL: url,
        INTEGRATION_DATABASE_ALLOWED_HOST: 'db.example.com',
      }).ok,
    ).toBe(true)
  })

  test.each([
    'host=db.example.com',
    'host=/cloudsql/project:region:instance',
    'hostaddr=10.0.0.5',
    'port=6543',
  ])('refuses a query string that overrides the server: %s', (query) => {
    expect(
      checkIntegrationDatabase({ INTEGRATION_DATABASE_URL: `${TEST_URL}?${query}` }),
    ).toMatchObject({ ok: false, reason: expect.stringContaining('query string') })
  })

  test('accepts other connection options in the query string', () => {
    expect(
      checkIntegrationDatabase({ INTEGRATION_DATABASE_URL: `${TEST_URL}?sslmode=disable` }).ok,
    ).toBe(true)
  })

  test('refuses the same database as DATABASE_URL', () => {
    expect(
      checkIntegrationDatabase({
        INTEGRATION_DATABASE_URL: TEST_URL,
        DATABASE_URL: 'postgresql://other:pw@localhost/lasce_test',
      }),
    ).toMatchObject({ ok: false, reason: expect.stringContaining('same database') })
  })

  test.each(['not a url', 'mysql://u:p@localhost/lasce_test', 'http://localhost/lasce_test'])(
    'refuses %j as not a PostgreSQL URL',
    (url) => {
      expect(checkIntegrationDatabase({ INTEGRATION_DATABASE_URL: url })).toMatchObject({
        ok: false,
        reason: expect.stringContaining('postgresql://'),
      })
    },
  )

  test('never repeats the credentials in its reasons', () => {
    const urls = [
      'postgresql://lasce:secret@db.example.com/lasce_test',
      'postgresql://lasce:secret@localhost/lasce',
    ]

    for (const url of urls) {
      const result = checkIntegrationDatabase({ INTEGRATION_DATABASE_URL: url })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.reason).not.toContain('secret')
    }
  })
})
