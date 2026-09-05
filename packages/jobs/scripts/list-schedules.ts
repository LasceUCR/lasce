/**
 * Prints the job schedulers currently registered in Redis and when each fires
 * next. Useful to confirm `pnpm jobs:register` did what you expected.
 *
 *   pnpm --filter @lasce/jobs schedules
 */
import { getQueue } from '../src/queue'

const queue = getQueue()
const schedulers = await queue.getJobSchedulers()

if (schedulers.length === 0) {
  console.log(`No schedulers registered on queue "${queue.name}". Run: pnpm jobs:register`)
} else {
  for (const scheduler of schedulers) {
    const next = scheduler.next ? new Date(scheduler.next).toISOString() : 'unknown'
    console.log(
      `${scheduler.key ?? scheduler.id}\t${scheduler.name}\t${scheduler.pattern}\tnext: ${next}`,
    )
  }
}

await queue.close()
process.exit(0)
