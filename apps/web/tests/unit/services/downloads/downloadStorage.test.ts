import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  clientOptions: vi.fn(),
  bucketExists: vi.fn(),
  makeBucket: vi.fn(),
  setBucketLifecycle: vi.fn(),
  setBucketPolicy: vi.fn(),
  putObject: vi.fn(),
  presignedGetObject: vi.fn(),
}))

vi.mock('@lasce/config/env', () => ({
  serverEnv: () => ({
    MINIO_ENDPOINT: 'localhost:9000',
    MINIO_USE_SSL: false,
    MINIO_ACCESS_KEY: 'key',
    MINIO_SECRET_KEY: 'secret',
    MINIO_BUCKET: 'lasce-files',
    MINIO_DOWNLOADS_BUCKET: 'lasce-downloads',
  }),
}))

vi.mock('minio', () => ({
  Client: class {
    constructor(options: unknown) {
      mocks.clientOptions(options)
    }
    bucketExists = mocks.bucketExists
    makeBucket = mocks.makeBucket
    setBucketLifecycle = mocks.setBucketLifecycle
    setBucketPolicy = mocks.setBucketPolicy
    putObject = mocks.putObject
    presignedGetObject = mocks.presignedGetObject
  },
}))

import { resetDownloadStorage, storeDownload } from '@/app/services/downloads/downloadStorage'

const body = Buffer.from('a,b\r\n')

function store() {
  return storeDownload('GOES/EXIS/2026-09-28/id.csv', body, 'text/csv; charset=utf-8', 'f.csv')
}

beforeEach(() => {
  resetDownloadStorage()
  mocks.bucketExists.mockResolvedValue(true)
  mocks.presignedGetObject.mockResolvedValue('http://localhost:9000/signed')
})

afterEach(() => {
  vi.resetAllMocks()
})

describe('storeDownload', () => {
  test('writes the object to the private downloads bucket and returns a 30-minute link', async () => {
    await expect(store()).resolves.toBe('http://localhost:9000/signed')

    expect(mocks.clientOptions).toHaveBeenCalledWith(
      expect.objectContaining({ endPoint: 'localhost', port: 9000, useSSL: false }),
    )
    expect(mocks.putObject).toHaveBeenCalledWith(
      'lasce-downloads',
      'GOES/EXIS/2026-09-28/id.csv',
      body,
      body.length,
      { 'Content-Type': 'text/csv; charset=utf-8' },
    )
    expect(mocks.presignedGetObject).toHaveBeenCalledWith(
      'lasce-downloads',
      'GOES/EXIS/2026-09-28/id.csv',
      1800,
      { 'response-content-disposition': 'attachment; filename="f.csv"' },
    )
  })

  test('never gives the bucket a policy, so objects stay private', async () => {
    mocks.bucketExists.mockResolvedValue(false)

    await store()

    expect(mocks.makeBucket).toHaveBeenCalledWith('lasce-downloads')
    expect(mocks.setBucketPolicy).not.toHaveBeenCalled()
  })

  test('expires objects after a day', async () => {
    await store()

    expect(mocks.setBucketLifecycle).toHaveBeenCalledWith('lasce-downloads', {
      Rule: [
        {
          ID: 'expire-downloads',
          Status: 'Enabled',
          Filter: { Prefix: '' },
          Expiration: { Days: 1 },
        },
      ],
    })
  })

  test('prepares the bucket once per process', async () => {
    await store()
    await store()

    expect(mocks.bucketExists).toHaveBeenCalledTimes(1)
    expect(mocks.setBucketLifecycle).toHaveBeenCalledTimes(1)
    expect(mocks.putObject).toHaveBeenCalledTimes(2)
  })

  test('tolerates another process creating the bucket first', async () => {
    mocks.bucketExists.mockResolvedValue(false)
    mocks.makeBucket.mockRejectedValue(
      Object.assign(new Error('taken'), {
        code: 'BucketAlreadyOwnedByYou',
      }),
    )

    await expect(store()).resolves.toBe('http://localhost:9000/signed')
  })

  test('retries preparing the bucket after a failure', async () => {
    mocks.bucketExists.mockRejectedValueOnce(new Error('offline'))

    await expect(store()).rejects.toThrow('offline')
    await expect(store()).resolves.toBe('http://localhost:9000/signed')
    expect(mocks.bucketExists).toHaveBeenCalledTimes(2)
  })

  test('rethrows any other bucket creation error', async () => {
    mocks.bucketExists.mockResolvedValue(false)
    mocks.makeBucket.mockRejectedValue(new Error('denied'))

    await expect(store()).rejects.toThrow('denied')
    expect(mocks.putObject).not.toHaveBeenCalled()
  })
})
