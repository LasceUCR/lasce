import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import {
  DOWNLOAD_EXPIRY_SECONDS,
  InvalidFileSizeError,
  InvalidFileTypeError,
  MAX_ASSET_BYTES,
  MinioAssetStorage,
} from '@/app/services/storage'

const bucketExists = vi.fn()
const makeBucket = vi.fn()
const putObject = vi.fn()
const removeObject = vi.fn()
const presignedGetObject = vi.fn()

vi.mock('minio', () => ({
  Client: class {
    bucketExists = bucketExists
    makeBucket = makeBucket
    putObject = putObject
    removeObject = removeObject
    presignedGetObject = presignedGetObject
  },
}))

function fileOf(name: string, type: string, size?: number): File {
  const file = new File(['content'], name, { type })
  if (size !== undefined) Object.defineProperty(file, 'size', { value: size })
  return file
}

beforeEach(() => {
  vi.clearAllMocks()
  bucketExists.mockResolvedValue(true)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

describe('MinioAssetStorage', () => {
  describe('verifyAsset', () => {
    test('accepts an allowed content type under the size cap', () => {
      const storage = new MinioAssetStorage()

      expect(() => storage.verifyAsset(fileOf('a.png', 'image/png', 1024))).not.toThrow()
    })

    // Pins that the size check is `>`, not `>=` — a file of exactly the cap is allowed.
    test('accepts a file of exactly the size cap', () => {
      const storage = new MinioAssetStorage()

      expect(() => storage.verifyAsset(fileOf('a.png', 'image/png', MAX_ASSET_BYTES))).not.toThrow()
    })

    test('throws InvalidFileSizeError above the size cap', () => {
      const storage = new MinioAssetStorage()
      const file = fileOf('a.png', 'image/png', MAX_ASSET_BYTES + 1)

      expect(() => storage.verifyAsset(file)).toThrow(InvalidFileSizeError)
      try {
        storage.verifyAsset(file)
      } catch (error) {
        expect((error as InvalidFileSizeError).statusCode).toBe(413)
        expect((error as InvalidFileSizeError).errorCode).toBe('INVALID_FILE_SIZE')
      }
    })

    test('throws InvalidFileTypeError for a disallowed content type', () => {
      const storage = new MinioAssetStorage()
      const file = fileOf('a.zip', 'application/zip', 1024)

      expect(() => storage.verifyAsset(file)).toThrow(InvalidFileTypeError)
      try {
        storage.verifyAsset(file)
      } catch (error) {
        expect((error as InvalidFileTypeError).statusCode).toBe(415)
        expect((error as InvalidFileTypeError).errorCode).toBe('INVALID_FILE_TYPE')
      }
    })

    // Size is checked before type: a file that violates both surfaces the size error.
    test('reports size before type when a file violates both', () => {
      const storage = new MinioAssetStorage()
      const file = fileOf('a.zip', 'application/zip', MAX_ASSET_BYTES + 1)

      expect(() => storage.verifyAsset(file)).toThrow(InvalidFileSizeError)
    })
  })

  describe('createUpload', () => {
    test('returns a timestamped key and calls putObject with the expected args', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
      const storage = new MinioAssetStorage()
      const file = fileOf('report.csv', 'text/csv')

      const key = await storage.createUpload(file, 'my-bucket')

      expect(key).toBe(`${new Date('2026-01-01T00:00:00.000Z').getTime()}_report.csv`)
      expect(putObject).toHaveBeenCalledWith('my-bucket', key, expect.any(Buffer), file.size, {
        'Content-Type': 'text/csv',
        'Content-Length': file.size.toString(),
      })
    })

    test('prefers the explicit bucket argument over MINIO_DEFAULT_BUCKET', async () => {
      vi.stubEnv('MINIO_DEFAULT_BUCKET', 'env-bucket')
      const storage = new MinioAssetStorage()
      const file = fileOf('a.png', 'image/png')

      await storage.createUpload(file, 'explicit-bucket')

      expect(putObject).toHaveBeenCalledWith(
        'explicit-bucket',
        expect.any(String),
        expect.any(Buffer),
        file.size,
        expect.any(Object),
      )
    })

    test('falls back to MINIO_DEFAULT_BUCKET when no argument is given', async () => {
      vi.stubEnv('MINIO_DEFAULT_BUCKET', 'env-bucket')
      const storage = new MinioAssetStorage()
      const file = fileOf('a.png', 'image/png')

      await storage.createUpload(file)

      expect(putObject).toHaveBeenCalledWith(
        'env-bucket',
        expect.any(String),
        expect.any(Buffer),
        file.size,
        expect.any(Object),
      )
    })

    test("falls back to 'default' when neither argument nor MINIO_DEFAULT_BUCKET is set", async () => {
      vi.stubEnv('MINIO_DEFAULT_BUCKET', '')
      const storage = new MinioAssetStorage()
      const file = fileOf('a.png', 'image/png')

      await storage.createUpload(file)

      expect(putObject).toHaveBeenCalledWith(
        'default',
        expect.any(String),
        expect.any(Buffer),
        file.size,
        expect.any(Object),
      )
    })

    test('calls makeBucket when the bucket does not exist', async () => {
      bucketExists.mockResolvedValue(false)
      const storage = new MinioAssetStorage()
      const file = fileOf('a.png', 'image/png')

      await storage.createUpload(file, 'new-bucket')

      expect(makeBucket).toHaveBeenCalledWith('new-bucket', '')
    })

    test('does not call makeBucket when the bucket already exists', async () => {
      bucketExists.mockResolvedValue(true)
      const storage = new MinioAssetStorage()
      const file = fileOf('a.png', 'image/png')

      await storage.createUpload(file, 'existing-bucket')

      expect(makeBucket).not.toHaveBeenCalled()
    })

    // An invalid file must never reach MinIO — validation happens before any client call.
    test('rejects an invalid file without touching MinIO', async () => {
      const storage = new MinioAssetStorage()
      const file = fileOf('a.zip', 'application/zip')

      await expect(storage.createUpload(file)).rejects.toThrow(InvalidFileTypeError)
      expect(bucketExists).not.toHaveBeenCalled()
      expect(putObject).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    test('calls removeObject with the MINIO_BUCKET value and the given key', async () => {
      vi.stubEnv('MINIO_BUCKET', 'the-bucket')
      const storage = new MinioAssetStorage()

      await storage.delete('some/object-key')

      expect(removeObject).toHaveBeenCalledWith('the-bucket', 'some/object-key')
    })
  })

  describe('createDownloadUrl', () => {
    test('returns the presigned URL and defaults expiry to DOWNLOAD_EXPIRY_SECONDS', async () => {
      vi.stubEnv('MINIO_BUCKET', 'the-bucket')
      presignedGetObject.mockResolvedValue('https://minio.example/presigned')
      const storage = new MinioAssetStorage()

      const url = await storage.createDownloadUrl('some/object-key')

      expect(url).toBe('https://minio.example/presigned')
      expect(presignedGetObject).toHaveBeenCalledWith(
        'the-bucket',
        'some/object-key',
        DOWNLOAD_EXPIRY_SECONDS,
      )
    })

    test('forwards an explicit expiresInSeconds', async () => {
      vi.stubEnv('MINIO_BUCKET', 'the-bucket')
      presignedGetObject.mockResolvedValue('https://minio.example/presigned')
      const storage = new MinioAssetStorage()

      await storage.createDownloadUrl('some/object-key', 120)

      expect(presignedGetObject).toHaveBeenCalledWith('the-bucket', 'some/object-key', 120)
    })
  })
})
