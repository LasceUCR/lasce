import { Readable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { resetServerEnv } from '@lasce/config/env'
import { INITIATIVE_LOGO_MAX_BYTES } from '@/app/lib/initiative-logo'
import {
  logoExtension,
  readInitiativeLogo,
  storeInitiativeLogo,
} from '@/app/services/initiatives/logoStorage'

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

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1sAAAAASUVORK5CYII=',
  'base64',
)

beforeEach(() => {
  vi.clearAllMocks()
  resetServerEnv()
  vi.stubEnv('DATABASE_URL', 'postgresql://localhost/lasce_test')
  vi.stubEnv('REDIS_URL', 'redis://localhost:6379')
  vi.stubEnv('CRON_SECRET', 'test-cron-secret')
  vi.stubEnv('MINIO_ENDPOINT', 'localhost:9000')
  vi.stubEnv('MINIO_ACCESS_KEY', 'test-access')
  vi.stubEnv('MINIO_SECRET_KEY', 'test-secret')
  vi.stubEnv('MINIO_BUCKET', 'test-logos')
  sdk.bucketExists.mockResolvedValue(true)
  sdk.putObject.mockResolvedValue({})
})
afterEach(() => {
  vi.unstubAllEnvs()
  resetServerEnv()
})

describe('initiative logo storage', () => {
  test('stores a generated filename in the configured bucket without making the bucket public', async () => {
    const url = await storeInitiativeLogo(png, 'image/png')
    expect(url).toMatch(/^\/api\/initiatives\/logos\/[a-f0-9-]+\.png$/)
    expect(sdk.putObject).toHaveBeenCalledWith(
      'test-logos',
      `assets/initiatives/${url.split('/').at(-1)}`,
      png,
      png.length,
      { 'Content-Type': 'image/png' },
    )
    expect(sdk.setBucketPolicy).not.toHaveBeenCalled()
  })
  test('rejects spoofed types and oversize images before accessing storage', async () => {
    expect(logoExtension(png, 'image/jpeg')).toBeNull()
    await expect(storeInitiativeLogo(Buffer.from('<svg/>'), 'image/png')).rejects.toThrow()
    const large = Buffer.alloc(INITIATIVE_LOGO_MAX_BYTES + 1)
    png.copy(large)
    await expect(storeInitiativeLogo(large, 'image/png')).rejects.toThrow()
    expect(sdk.bucketExists).not.toHaveBeenCalled()
    expect(sdk.putObject).not.toHaveBeenCalled()
  })
  test('reads only generated initiative filenames and preserves image bytes', async () => {
    const filename = '01200000-0000-4000-8000-000000000003.png'
    sdk.getObject.mockResolvedValue(Readable.from([png]))
    expect(await readInitiativeLogo(filename)).toEqual({ body: png, contentType: 'image/png' })
    expect(sdk.getObject).toHaveBeenCalledWith('test-logos', `assets/initiatives/${filename}`)
    sdk.getObject.mockClear()
    await expect(readInitiativeLogo('../readings/private.png')).rejects.toThrow()
    expect(sdk.getObject).not.toHaveBeenCalled()
  })
  test('tolerates another request creating the bucket first', async () => {
    sdk.bucketExists.mockResolvedValue(false)
    sdk.makeBucket.mockRejectedValue({ code: 'BucketAlreadyOwnedByYou' })
    await expect(storeInitiativeLogo(png, 'image/png')).resolves.toMatch(
      /^\/api\/initiatives\/logos\//,
    )
  })
})
