import * as Minio from 'minio'
import { NextResponse } from 'next/server'

import { serverEnv } from '@lasce/config/env'

/**
 * Serves the latest SUVI preview PNG the worker publishes at the end of `suvi-pipeline`
 * (`apps/worker/app/services/suvi_preview.py`). Backs the PoC page at `/suvi`.
 *
 * Deliberately does not use `apps/web/app/services/storage`: that layer builds its client at
 * construction time and throws under the documented `MINIO_ENDPOINT` value (see
 * `docs/manage-assets.md#known-gaps`). This route builds its own client per request instead,
 * parsing the endpoint the same way the worker does in `apps/worker/app/clients/storage.py`.
 */
export const dynamic = 'force-dynamic'

const SLUG_PATTERN = /^[a-z0-9-]+$/

interface MinioEndpoint {
  endPoint: string
  port: number
  useSSL: boolean
}

/** Splits `MINIO_ENDPOINT` into what the JS SDK wants: a bare host, a port and a TLS flag. */
function parseEndpoint(endpoint: string, useSslDefault: boolean): MinioEndpoint {
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

function isNotFoundError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false
  const code = (error as { code: unknown }).code
  return code === 'NoSuchKey' || code === 'NotFound'
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ satellite: string; channel: string }> },
): Promise<NextResponse> {
  const { satellite, channel } = await params

  if (!SLUG_PATTERN.test(satellite) || !SLUG_PATTERN.test(channel)) {
    return NextResponse.json({ error: 'Satélite o canal inválido.' }, { status: 400 })
  }

  const env = serverEnv()
  const { endPoint, port, useSSL } = parseEndpoint(env.MINIO_ENDPOINT, env.MINIO_USE_SSL)
  const client = new Minio.Client({
    endPoint,
    port,
    useSSL,
    accessKey: env.MINIO_ACCESS_KEY ?? '',
    secretKey: env.MINIO_SECRET_KEY ?? '',
  })

  const key = `suvi/preview/${satellite}/${channel}.png`

  try {
    const stream = await client.getObject(env.MINIO_BUCKET, key)
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer)
    }
    const buffer = Buffer.concat(chunks)

    return new NextResponse(buffer, {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' },
    })
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return NextResponse.json({ error: 'No hay imagen todavía' }, { status: 404 })
    }
    throw error
  }
}
