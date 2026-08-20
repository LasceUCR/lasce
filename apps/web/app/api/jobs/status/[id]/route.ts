import { getJobStatus } from '@lasce/jobs'
import { NextResponse } from 'next/server'

/**
 * Reads one job's state from Redis. Used by the demo page to poll a job it just
 * enqueued. No secret required — it only exposes the status of a job whose id
 * the caller already knows.
 */
export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params
  const status = await getJobStatus(id)

  if (!status) {
    // BullMQ evicts completed jobs after the retention window in defaultJobOptions.
    return NextResponse.json({ error: 'Job not found or already evicted' }, { status: 404 })
  }

  return NextResponse.json(status)
}
