import type { JobName, JobPayload } from '@lasce/contracts'
import { jobPayloads } from '@lasce/contracts'
import type { JobsOptions } from 'bullmq'

import { getQueue } from './queue'

/**
 * The only supported way to put a job on the queue.
 *
 * The payload is validated against its contract first, so a malformed job is
 * rejected here — in the process that can still return a useful error — instead
 * of blowing up inside a Python processor minutes later.
 */
export async function enqueue<K extends JobName>(
  name: K,
  payload: JobPayload<K>,
  options?: JobsOptions,
): Promise<string> {
  const schema = jobPayloads[name]
  const parsed = schema.parse(payload)

  const job = await getQueue().add(name, parsed, options)

  if (!job.id) {
    throw new Error(`BullMQ returned no id for job "${name}"`)
  }

  return job.id
}
