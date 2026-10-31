import { randomUUID } from 'node:crypto'
import * as Minio from 'minio'
import { serverEnv } from '@lasce/config/env'

import { INITIATIVE_LOGO_FILENAME, INITIATIVE_LOGO_MAX_BYTES } from '@/app/lib/initiative-logo'
import { parseEndpoint } from '@/app/lib/suvi-storage'

const PREFIX = 'assets/initiatives/'
const contentTypes = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
} as const
type ImageExtension = keyof typeof contentTypes

/** Check the image signature as well as the browser's declared MIME type. */
export function logoExtension(body: Buffer, contentType: string): ImageExtension | null {
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

function storage() {
  const env = serverEnv()
  if (!env.MINIO_ACCESS_KEY || !env.MINIO_SECRET_KEY) {
    throw new Error('MinIO credentials are required to store initiative logos.')
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

/** Store under an isolated prefix without changing the shared bucket's access policy. */
export async function storeInitiativeLogo(body: Buffer, contentType: string): Promise<string> {
  const extension = logoExtension(body, contentType)
  if (!extension || !body.length || body.length > INITIATIVE_LOGO_MAX_BYTES) {
    throw new Error('Invalid initiative logo.')
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
  await client.putObject(bucket, PREFIX + filename, body, body.length, {
    'Content-Type': contentTypes[extension],
  })
  return `/api/initiatives/logos/${filename}`
}

/** Only generated initiative filenames are reachable through the public image route. */
export async function readInitiativeLogo(filename: string) {
  if (!INITIATIVE_LOGO_FILENAME.test(filename)) throw new Error('Invalid initiative logo filename.')
  const { client, bucket } = storage()
  const stream = await client.getObject(bucket, PREFIX + filename)
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of stream) {
    const buffer = Buffer.from(chunk as Uint8Array)
    size += buffer.length
    if (size > INITIATIVE_LOGO_MAX_BYTES) throw new Error('Initiative logo exceeds the size limit.')
    chunks.push(buffer)
  }
  const extension = filename.split('.').at(-1) as ImageExtension
  return { body: Buffer.concat(chunks), contentType: contentTypes[extension] }
}
