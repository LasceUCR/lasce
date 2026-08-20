'use server'

import { isJobName, jobPayloads } from '@lasce/contracts'
import { enqueue } from '@lasce/jobs'

export type EnqueueResult = { ok: true; jobId: string } | { ok: false; error: string }

/**
 * Server Action used by the demo UI to enqueue a job.
 *
 * The browser deliberately does not go through `/api/jobs/[name]/trigger`: that
 * route is guarded by CRON_SECRET, which must never reach the client. Same
 * queue, same processors, different door.
 */
export async function enqueueJob(name: string, payload: unknown): Promise<EnqueueResult> {
  if (!isJobName(name)) {
    return { ok: false, error: `Unknown job "${name}"` }
  }

  const parsed = jobPayloads[name].safeParse(payload)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((issue) => issue.message).join(', ') }
  }

  try {
    const jobId = await enqueue(name, parsed.data as never)
    return { ok: true, jobId }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to enqueue' }
  }
}
