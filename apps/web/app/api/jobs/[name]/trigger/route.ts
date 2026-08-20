import { isJobName, jobPayloads } from '@lasce/contracts'
import { serverEnv } from '@lasce/config/env'
import { enqueue } from '@lasce/jobs'
import { NextResponse } from 'next/server'

/**
 * Enqueues a job over HTTP.
 *
 *   POST /api/jobs/ingest-readings/trigger
 *   Authorization: Bearer $CRON_SECRET
 *   { "deviceId": "device-001", "from": "...", "to": "..." }
 *
 * This is the second of the two ways a scheduled job can fire (the first being
 * BullMQ's own scheduler, see `pnpm jobs:register`). Point Vercel Cron, a GitHub
 * Actions workflow or a Kubernetes CronJob at it and the same Python processor
 * runs — nothing downstream knows which trigger was used.
 */
export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ name: string }> },
): Promise<NextResponse> {
  const authorization = request.headers.get('authorization')
  if (authorization !== `Bearer ${serverEnv().CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name } = await params
  if (!isJobName(name)) {
    return NextResponse.json({ error: `Unknown job "${name}"` }, { status: 404 })
  }

  // An empty body is valid for jobs whose payload has no required fields.
  let body: unknown = {}
  const raw = await request.text()
  if (raw.trim().length > 0) {
    try {
      body = JSON.parse(raw)
    } catch {
      return NextResponse.json({ error: 'Body is not valid JSON' }, { status: 400 })
    }
  }

  const parsed = jobPayloads[name].safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', issues: parsed.error.issues },
      { status: 422 },
    )
  }

  const jobId = await enqueue(name, parsed.data as never)

  return NextResponse.json({ jobId, name }, { status: 202 })
}
