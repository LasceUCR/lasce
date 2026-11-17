import { randomUUID } from 'node:crypto'
import * as Minio from 'minio'
import { serverEnv } from '@lasce/config/env'

import { parseEndpoint } from '@/app/lib/suvi-storage'

const contentTypes = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
} as const
export type ImageExtension = keyof typeof contentTypes

/** Check the image signature as well as the browser's declared MIME type. */
export function imageExtension(body: Buffer, contentType: string): ImageExtension | null {
  if (
    contentType === 'image/png' &&
    body.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return 'png'
  if (contentType === 'image/jpeg' && body[0] === 255 && body[1] === 216 && body[2] === 255)
    return 'jpg'
  if (
    contentType === 'image/webp' &&
    body.toString('ascii', 0, 4) === 'RIFF' &&
    body.toString('ascii', 8, 12) === 'WEBP'
  )
    return 'webp'
  if (contentType === 'image/gif' && ['GIF87a', 'GIF89a'].includes(body.toString('ascii', 0, 6)))
    return 'gif'
  return null
}

export interface ImageStoreOptions {
  /** Object key prefix inside `MINIO_BUCKET`, ending in `/`, e.g. `assets/initiatives/`. */
  prefix: string
  /** The application route that serves the stored files, e.g. `/api/initiatives/logos`. */
  publicPath: string
  /** Generated filenames this store accepts when reading. */
  filename: RegExp
  maxBytes: number
  /** Names the images in error messages, e.g. `initiative logo`. */
  label: string
}

/**
 * An isolated MinIO prefix for images uploaded through the CMS. Files get UUID names, are
 * served by the application (so MinIO can stay internal) and never change the shared bucket's
 * access policy or touch objects outside `prefix`.
 */
export function createImageStore({
  prefix,
  publicPath,
  filename: filenamePattern,
  maxBytes,
  label,
}: ImageStoreOptions) {
  function storage() {
    const env = serverEnv()
    if (!env.MINIO_ACCESS_KEY || !env.MINIO_SECRET_KEY) {
      throw new Error(`MinIO credentials are required to store ${label}s.`)
    }
    return {
      bucket: env.MINIO_BUCKET,
      client: new Minio.Client({
        ...parseEndpoint(env.MINIO_ENDPOINT, env.MINIO_USE_SSL),
        accessKey: env.MINIO_ACCESS_KEY,
        secretKey: env.MINIO_SECRET_KEY,
      }),
    }
  }

  /** Store a validated image and return the application path that serves it. */
  async function store(body: Buffer, contentType: string): Promise<string> {
    const extension = imageExtension(body, contentType)
    if (!extension || !body.length || body.length > maxBytes) {
      throw new Error(`Invalid ${label}.`)
    }
    const { client, bucket } = storage()
    if (!(await client.bucketExists(bucket))) {
      try {
        await client.makeBucket(bucket)
      } catch (error) {
        if (
          typeof error !== 'object' ||
          error === null ||
          !('code' in error) ||
          !['BucketAlreadyOwnedByYou', 'BucketAlreadyExists'].includes(String(error.code))
        )
          throw error
      }
    }
    const filename = `${randomUUID()}.${extension}`
    await client.putObject(bucket, prefix + filename, body, body.length, {
      'Content-Type': contentTypes[extension],
    })
    return `${publicPath}/${filename}`
  }

  /** Only generated filenames are reachable, so no other object can be read through it. */
  async function read(filename: string) {
    if (!filenamePattern.test(filename)) throw new Error(`Invalid ${label} filename.`)
    const { client, bucket } = storage()
    const stream = await client.getObject(bucket, prefix + filename)
    const chunks: Buffer[] = []
    let size = 0
    for await (const chunk of stream) {
      const buffer = Buffer.from(chunk as Uint8Array)
      size += buffer.length
      if (size > maxBytes) throw new Error(`The ${label} exceeds the size limit.`)
      chunks.push(buffer)
    }
    const extension = filename.split('.').at(-1) as ImageExtension
    return { body: Buffer.concat(chunks), contentType: contentTypes[extension] }
  }

  return { store, read }
}
