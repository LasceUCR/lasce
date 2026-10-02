import { afterEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  env: {} as Record<string, unknown>,
  clientOptions: vi.fn(),
  getObject: vi.fn(),
}))

vi.mock('@lasce/config/env', () => ({ serverEnv: () => mocks.env }))

vi.mock('minio', () => ({
  Client: class {
    constructor(options: unknown) {
      mocks.clientOptions(options)
    }
    getObject = mocks.getObject
  },
}))

import { isNotFoundError, readSuviObject } from './suvi-storage'

function useEnv(endpoint: string, useSsl = false) {
  mocks.env = {
    MINIO_ENDPOINT: endpoint,
    MINIO_USE_SSL: useSsl,
    MINIO_BUCKET: 'lasce-files',
    MINIO_ACCESS_KEY: 'key',
    MINIO_SECRET_KEY: 'secret',
  }
}

async function* chunks(...parts: string[]) {
  for (const part of parts) yield Buffer.from(part)
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('readSuviObject', () => {
  test('reads the whole object from the configured bucket', async () => {
    useEnv('localhost:9000')
    mocks.getObject.mockResolvedValue(chunks('ab', 'cd'))

    const buffer = await readSuviObject('suvi/preview/g19/fe171.webp')

    expect(buffer.toString()).toBe('abcd')
    expect(mocks.getObject).toHaveBeenCalledWith('lasce-files', 'suvi/preview/g19/fe171.webp')
  })

  test.each([
    ['a bare host and port', 'minio:9100', false, { endPoint: 'minio', port: 9100, useSSL: false }],
    ['a bare host', 'minio', true, { endPoint: 'minio', port: 9000, useSSL: true }],
    [
      'an https URL without a port',
      'https://files.example.org',
      false,
      { endPoint: 'files.example.org', port: 443, useSSL: true },
    ],
    [
      'an http URL with a port',
      'http://minio:9000',
      false,
      { endPoint: 'minio', port: 9000, useSSL: false },
    ],
    [
      'an http URL without a port',
      'http://minio',
      false,
      { endPoint: 'minio', port: 80, useSSL: false },
    ],
  ])('connects to %s', async (_label, endpoint, useSsl, expected) => {
    useEnv(endpoint, useSsl)
    mocks.getObject.mockResolvedValue(chunks())

    await readSuviObject('key')

    expect(mocks.clientOptions).toHaveBeenCalledWith({
      ...expected,
      accessKey: 'key',
      secretKey: 'secret',
    })
  })
})

describe('isNotFoundError', () => {
  test.each([
    [{ code: 'NoSuchKey' }, true],
    [{ code: 'NotFound' }, true],
    [{ code: 'AccessDenied' }, false],
    [new Error('plain'), false],
    [null, false],
  ])('classifies %j as %s', (error, expected) => {
    expect(isNotFoundError(error)).toBe(expected)
  })
})
