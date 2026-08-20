/**
 * Syncs `schedules` (see src/schedules.ts) into BullMQ's scheduler.
 *
 * Run it by hand during development and as a deploy step in production:
 *
 *   pnpm jobs:register
 *
 * It is idempotent — declared entries are upserted, and any scheduler still in
 * Redis that is no longer declared gets removed, so deleting an entry from the
 * source file is enough to stop it firing.
 *
 * If you drive your cron from outside instead (Vercel Cron, GitHub Actions,
 * a Kubernetes CronJob hitting /api/jobs/[name]/trigger), you never run this.
 */
import { getQueue } from '../src/queue.js'
import { schedules } from '../src/schedules.js'

const queue = getQueue()

for (const schedule of schedules) {
  await queue.upsertJobScheduler(
    schedule.id,
    { pattern: schedule.cron, tz: schedule.timezone },
    { name: schedule.name, data: schedule.data },
  )
  console.log(`upserted "${schedule.id}" -> ${schedule.name} (${schedule.cron})`)
}

const declared = new Set(schedules.map((schedule) => schedule.id))
const existing = await queue.getJobSchedulers()

for (const scheduler of existing) {
  const id = scheduler.key ?? scheduler.id
  if (!id || declared.has(id)) continue

  await queue.removeJobScheduler(id)
  console.log(`removed stale scheduler "${id}"`)
}

console.log(`\n${schedules.length} schedule(s) in sync on queue "${queue.name}".`)

await queue.close()
process.exit(0)
