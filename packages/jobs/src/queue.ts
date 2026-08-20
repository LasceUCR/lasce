import { serverEnv } from '@lasce/config/env'
import type { JobState, JobStatus } from '@lasce/types'
import { Job, Queue } from 'bullmq'

import { getRedisConnection } from './connection.js'

/**
 * Defaults applied to every job. Deliberately conservative: three attempts with
 * exponential backoff covers a flaky upstream, and the retention caps stop Redis
 * from growing without bound while still leaving recent history to inspect.
 */
export const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2_000 },
  removeOnComplete: { age: 24 * 3600, count: 1_000 },
  removeOnFail: { age: 7 * 24 * 3600 },
} as const

const globalForQueue = globalThis as unknown as { lasceQueue?: Queue }

/** The queue the Python worker in `apps/worker` consumes from. */
export function getQueue(): Queue {
  if (globalForQueue.lasceQueue) return globalForQueue.lasceQueue

  const queue = new Queue(serverEnv().QUEUE_NAME, {
    connection: getRedisConnection(),
    defaultJobOptions,
  })

  globalForQueue.lasceQueue = queue
  return queue
}

/** Reads one job's current state, shaped for the API route and the UI. */
export async function getJobStatus(jobId: string): Promise<JobStatus | null> {
  const job = await Job.fromId(getQueue(), jobId)
  if (!job) return null

  const state = (await job.getState()) as JobState

  return {
    id: job.id ?? jobId,
    name: job.name,
    state,
    progress: typeof job.progress === 'number' ? job.progress : 0,
    attemptsMade: job.attemptsMade,
    returnValue: job.returnvalue ?? null,
    failedReason: job.failedReason ?? null,
    createdAt: new Date(job.timestamp).toISOString(),
    finishedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
  }
}
