import * as Minio from 'minio'

import { serverEnv } from '@lasce/config/env'

import { DOWNLOAD_LINK_TTL_SECONDS } from '@/app/lib/downloads/formats'
import { parseEndpoint } from '@/app/lib/suvi-storage'

/**
 * The private bucket behind `/datos` downloads (`MINIO_DOWNLOADS_BUCKET`).
 *
 * Deliberately separate from `app/services/storage`: `MinioAssetStorage.ensureBucket()` gives its
 * bucket an anonymous public-read policy, which would let anyone fetch a generated file without a
 * signature and make the 30-minute link expiry meaningless. This module never sets a bucket
 * policy. Objects are reachable only through presigned links, and a lifecycle rule deletes them
 * after a day; the `resource_downloads` table is the permanent record.
 */

export const DOWNLOAD_OBJECT_EXPIRY_DAYS = 1

const EXPIRY_RULE = {
  Rule: [
    {
      ID: 'expire-downloads',
      Status: 'Enabled',
      Filter: { Prefix: '' },
      Expiration: { Days: DOWNLOAD_OBJECT_EXPIRY_DAYS },
    },
  ],
}

/** Another process created the bucket between our check and our create. */
function isBucketTakenError(error: unknown) {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false
  const code = (error as { code: unknown }).code
  return code === 'BucketAlreadyOwnedByYou' || code === 'BucketAlreadyExists'
}

function clientFromEnv() {
  const env = serverEnv()
  const { endPoint, port, useSSL } = parseEndpoint(env.MINIO_ENDPOINT, env.MINIO_USE_SSL)
  const client = new Minio.Client({
    endPoint,
    port,
    useSSL,
    accessKey: env.MINIO_ACCESS_KEY ?? '',
    secretKey: env.MINIO_SECRET_KEY ?? '',
  })
  return { client, bucket: env.MINIO_DOWNLOADS_BUCKET }
}

let ready: Promise<void> | null = null

/** Creates the bucket and its expiry rule once per process. A failure is retried on the next call. */
function ensureReady(client: Minio.Client, bucket: string): Promise<void> {
  ready ??= (async () => {
    if (!(await client.bucketExists(bucket))) {
      try {
        await client.makeBucket(bucket)
      } catch (error) {
        if (!isBucketTakenError(error)) throw error
      }
    }
    await client.setBucketLifecycle(bucket, EXPIRY_RULE)
  })().catch((error: unknown) => {
    ready = null
    throw error
  })
  return ready
}

/** Test seam: forget that the bucket was prepared. */
export function resetDownloadStorage() {
  ready = null
}

/** Stores `body` under `key`, then returns a presigned link that downloads it as `filename`. */
export async function storeDownload(
  key: string,
  body: Buffer,
  contentType: string,
  filename: string,
): Promise<string> {
  const { client, bucket } = clientFromEnv()
  await ensureReady(client, bucket)
  await client.putObject(bucket, key, body, body.length, { 'Content-Type': contentType })
  return client.presignedGetObject(bucket, key, DOWNLOAD_LINK_TTL_SECONDS, {
    'response-content-disposition': `attachment; filename="${filename}"`,
  })
}
