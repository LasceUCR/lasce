import type { Queue } from 'bullmq'

import { getQueue } from './queue'
import { schedules } from './schedules'

export interface ScheduleSync {
  queue: string
  upserted: string[]
  removed: string[]
}

/**
 * Syncs `schedules` (see schedules.ts) into BullMQ's scheduler.
 *
 * Idempotent: declared entries are upserted, and any scheduler still in Redis
 * that is no longer declared gets removed, so deleting an entry from the source
 * file is enough to stop it firing. Called by `pnpm jobs:register` and by
 * `POST /api/jobs/schedules`, which is what a deploy uses because it cannot
 * reach the deployed Redis directly.
 */
export async function syncSchedules(queue: Queue = getQueue()): Promise<ScheduleSync> {
  const upserted: string[] = []
  for (const schedule of schedules) {
    await queue.upsertJobScheduler(
      schedule.id,
      { pattern: schedule.cron, tz: schedule.timezone },
      { name: schedule.name, data: schedule.data },
    )
    upserted.push(schedule.id)
  }

  const declared = new Set(upserted)
  const removed: string[] = []
  for (const scheduler of await queue.getJobSchedulers()) {
    const id = scheduler.key ?? scheduler.id
    if (!id || declared.has(id)) continue

    await queue.removeJobScheduler(id)
    removed.push(id)
  }

  return { queue: queue.name, upserted, removed }
}
