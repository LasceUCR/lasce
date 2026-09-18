/**
 * Removes every job scheduler currently registered in Redis, without touching
 * `schedules.ts`. Use this to stop all recurring jobs from firing while you
 * keep the declarations in source.
 *
 *   pnpm jobs:unregister
 *
 * Run `pnpm jobs:register` afterwards to restore them from the source file.
 */
import { getQueue } from '../src/queue'

const queue = getQueue()
const schedulers = await queue.getJobSchedulers()

if (schedulers.length === 0) {
  console.log(`No schedulers registered on queue "${queue.name}". Nothing to remove.`)
} else {
  for (const scheduler of schedulers) {
    const id = scheduler.key ?? scheduler.id
    if (!id) continue

    await queue.removeJobScheduler(id)
    console.log(`removed scheduler "${id}" (${scheduler.name})`)
  }
}

await queue.close()
process.exit(0)
