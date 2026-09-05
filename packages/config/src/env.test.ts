import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { resetServerEnv, serverEnv } from './env'

const REQUIRED = {
  DATABASE_URL: 'postgresql://lasce:lasce@localhost:5432/lasce',
  REDIS_URL: 'redis://localhost:6379',
  CRON_SECRET: 'a-secret-long-enough',
}

let original: NodeJS.ProcessEnv

beforeEach(() => {
  original = process.env
  // A fresh object per test: serverEnv() reads process.env once and memoises.
  process.env = { ...REQUIRED } as NodeJS.ProcessEnv
  resetServerEnv()
})

afterEach(() => {
  process.env = original
  resetServerEnv()
})

describe('serverEnv', () => {
  test('parses a complete environment', () => {
    const env = serverEnv()

    expect(env.DATABASE_URL).toBe(REQUIRED.DATABASE_URL)
    expect(env.REDIS_URL).toBe(REQUIRED.REDIS_URL)
    expect(env.CRON_SECRET).toBe(REQUIRED.CRON_SECRET)
  })

  test('applies the documented defaults', () => {
    const env = serverEnv()

    expect(env.NODE_ENV).toBe('development')
    expect(env.QUEUE_NAME).toBe('lasce')
  })

  test('memoises so later mutations of process.env are ignored', () => {
    expect(serverEnv().QUEUE_NAME).toBe('lasce')
    process.env.QUEUE_NAME = 'changed'

    expect(serverEnv().QUEUE_NAME).toBe('lasce')
  })

  test('resetServerEnv drops the memoised value', () => {
    expect(serverEnv().QUEUE_NAME).toBe('lasce')

    process.env.QUEUE_NAME = 'changed'
    resetServerEnv()

    expect(serverEnv().QUEUE_NAME).toBe('changed')
  })

  test('names the missing variable rather than failing later at the call site', () => {
    delete process.env.REDIS_URL

    // This is the failure the deployed web service actually hit: a missing
    // variable must fail loudly here, not as an opaque error further down.
    expect(() => serverEnv()).toThrowError(/REDIS_URL/)
  })

  test('rejects a CRON_SECRET that is too short to be worth having', () => {
    process.env.CRON_SECRET = 'short'

    expect(() => serverEnv()).toThrowError(/CRON_SECRET/)
  })

  test('rejects a malformed connection string', () => {
    process.env.DATABASE_URL = 'not-a-url'

    expect(() => serverEnv()).toThrowError(/DATABASE_URL/)
  })
})
