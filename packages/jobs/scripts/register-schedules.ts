/**
 * Syncs `schedules` (see src/schedules.ts) into BullMQ's scheduler.
 *
 * Run it by hand during development:
 *
 *   pnpm jobs:register
 *
 * Deployed environments call `POST /api/jobs/schedules` instead, which runs the
 * same `syncSchedules()` from inside the web container. See docs/deployment.md.
 *
 * If you drive your cron from outside instead (Vercel Cron, GitHub Actions,
 * a Kubernetes CronJob hitting /api/jobs/[name]/trigger), you never run this.
 */
import { getQueue } from '../src/queue'
import { syncSchedules } from '../src/sync-schedules'

const queue = getQueue()
const result = await syncSchedules(queue)

for (const id of result.upserted) console.log(`upserted "${id}"`)
for (const id of result.removed) console.log(`removed stale scheduler "${id}"`)
console.log(`\n${result.upserted.length} schedule(s) in sync on queue "${result.queue}".`)

await queue.close()
process.exit(0)
