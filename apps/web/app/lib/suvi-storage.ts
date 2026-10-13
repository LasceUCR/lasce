import * as Minio from 'minio'

import { serverEnv } from '@lasce/config/env'

/**
 * Read access to the SUVI WebP images the worker publishes to MinIO
 * (`apps/worker/app/services/suvi_preview.py`), shared by the `/api/suvi/*` routes.
 *
 * Deliberately does not use `apps/web/app/services/storage`: that layer builds its client at
 * construction time and throws under the documented `MINIO_ENDPOINT` value (see
 * `docs/manage-assets.md#known-gaps`). Callers build a client per request instead, parsing the
 * endpoint the same way the worker does in `apps/worker/app/clients/storage.py`.
 */

interface MinioEndpoint {
  endPoint: string
  port: number
  useSSL: boolean
}

/** Splits `MINIO_ENDPOINT` into what the JS SDK wants: a bare host, a port and a TLS flag. */
export function parseEndpoint(endpoint: string, useSslDefault: boolean): MinioEndpoint {
  if (endpoint.includes('://')) {
    const url = new URL(endpoint)
    const isHttps = url.protocol === 'https:'
    return {
      endPoint: url.hostname,
      port: url.port ? Number(url.port) : isHttps ? 443 : 80,
      useSSL: isHttps || useSslDefault,
    }
  }

  const [host, port] = endpoint.split(':')
  return {
    endPoint: host ?? endpoint,
    port: port ? Number(port) : 9000,
    useSSL: useSslDefault,
  }
}

export function isNotFoundError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false
  const code = (error as { code: unknown }).code
  return code === 'NoSuchKey' || code === 'NotFound'
}

/** Reads one object from the configured bucket into memory. Rejects with the SDK's error. */
export async function readSuviObject(key: string) {
  const env = serverEnv()
  const { endPoint, port, useSSL } = parseEndpoint(env.MINIO_ENDPOINT, env.MINIO_USE_SSL)
  const client = new Minio.Client({
    endPoint,
    port,
    useSSL,
    accessKey: env.MINIO_ACCESS_KEY ?? '',
    secretKey: env.MINIO_SECRET_KEY ?? '',
  })

  const stream = await client.getObject(env.MINIO_BUCKET, key)
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer)
  }
  return Buffer.concat(chunks)
}
