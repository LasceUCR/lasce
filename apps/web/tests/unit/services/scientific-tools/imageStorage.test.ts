import { Readable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { resetServerEnv } from '@lasce/config/env'
import { SCIENTIFIC_TOOL_IMAGE_MAX_BYTES } from '@/app/lib/scientific-tool-image'
import {
  readScientificToolImage,
  storeScientificToolImage,
} from '@/app/services/scientific-tools/imageStorage'

const sdk = vi.hoisted(() => ({
  bucketExists: vi.fn(),
  makeBucket: vi.fn(),
  putObject: vi.fn(),
  getObject: vi.fn(),
  setBucketPolicy: vi.fn(),
}))
vi.mock('minio', () => ({
  Client: class {
    bucketExists = sdk.bucketExists
    makeBucket = sdk.makeBucket
    putObject = sdk.putObject
    getObject = sdk.getObject
    setBucketPolicy = sdk.setBucketPolicy
  },
}))

const webp = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0, 0, 0, 0]),
  Buffer.from('WEBPVP8 '),
])

function stubEnv(credentials = true) {
  vi.stubEnv('DATABASE_URL', 'postgresql://localhost/lasce_test')
  vi.stubEnv('REDIS_URL', 'redis://localhost:6379')
  vi.stubEnv('CRON_SECRET', 'test-cron-secret')
  vi.stubEnv('MINIO_ENDPOINT', 'localhost:9000')
  vi.stubEnv('MINIO_ACCESS_KEY', credentials ? 'test-access' : undefined)
  vi.stubEnv('MINIO_SECRET_KEY', credentials ? 'test-secret' : undefined)
  vi.stubEnv('MINIO_BUCKET', 'test-assets')
}

beforeEach(() => {
  vi.clearAllMocks()
  resetServerEnv()
  stubEnv()
  sdk.bucketExists.mockResolvedValue(true)
  sdk.putObject.mockResolvedValue({})
})
afterEach(() => {
  vi.unstubAllEnvs()
  resetServerEnv()
})

describe('scientific tool image storage', () => {
  test('stores a generated filename under its own prefix and returns the serving path', async () => {
    const url = await storeScientificToolImage(webp, 'image/webp')
    expect(url).toMatch(/^\/api\/scientific-tools\/images\/[a-f0-9-]+\.webp$/)
    expect(sdk.putObject).toHaveBeenCalledWith(
      'test-assets',
      `assets/scientific-tools/${url.split('/').at(-1)}`,
      webp,
      webp.length,
      { 'Content-Type': 'image/webp' },
    )
    expect(sdk.setBucketPolicy).not.toHaveBeenCalled()
  })

  test('creates the bucket when it does not exist yet', async () => {
    sdk.bucketExists.mockResolvedValue(false)
    await storeScientificToolImage(webp, 'image/webp')
    expect(sdk.makeBucket).toHaveBeenCalledWith('test-assets')
  })

  test('propagates an unexpected bucket error', async () => {
    sdk.bucketExists.mockResolvedValue(false)
    sdk.makeBucket.mockRejectedValue({ code: 'AccessDenied' })
    await expect(storeScientificToolImage(webp, 'image/webp')).rejects.toEqual({
      code: 'AccessDenied',
    })
  })

  test('rejects invalid or oversize images before touching storage', async () => {
    await expect(storeScientificToolImage(webp, 'image/png')).rejects.toThrow()
    const large = Buffer.alloc(SCIENTIFIC_TOOL_IMAGE_MAX_BYTES + 1)
    webp.copy(large)
    await expect(storeScientificToolImage(large, 'image/webp')).rejects.toThrow()
    expect(sdk.bucketExists).not.toHaveBeenCalled()
  })

  test('requires MinIO credentials', async () => {
    vi.unstubAllEnvs()
    resetServerEnv()
    stubEnv(false)
    await expect(storeScientificToolImage(webp, 'image/webp')).rejects.toThrow(/credentials/)
  })

  test('reads only generated filenames under its prefix', async () => {
    const filename = '38300000-0000-4000-8000-000000000001.webp'
    sdk.getObject.mockResolvedValue(Readable.from([webp]))
    expect(await readScientificToolImage(filename)).toEqual({
      body: webp,
      contentType: 'image/webp',
    })
    expect(sdk.getObject).toHaveBeenCalledWith('test-assets', `assets/scientific-tools/${filename}`)
    sdk.getObject.mockClear()
    await expect(readScientificToolImage('../readings/data.webp')).rejects.toThrow()
    expect(sdk.getObject).not.toHaveBeenCalled()
  })

  test('stops reading an object larger than the limit', async () => {
    sdk.getObject.mockResolvedValue(
      Readable.from([Buffer.alloc(SCIENTIFIC_TOOL_IMAGE_MAX_BYTES), Buffer.alloc(1)]),
    )
    await expect(
      readScientificToolImage('38300000-0000-4000-8000-000000000001.png'),
    ).rejects.toThrow(/size limit/)
  })
})
