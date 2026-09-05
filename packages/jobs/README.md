# @lasce/jobs

The producer half of the queue. `apps/web` imports this package to put work on Redis; the Python
worker in `apps/worker` consumes it. Both sides speak BullMQ — the official Python port runs the
same Lua scripts as the Node one, so the two are interoperable over the same queue.

## Enqueueing

```ts
import { enqueue } from '@lasce/jobs'
import { JOB_NAMES } from '@lasce/contracts'

const jobId = await enqueue(JOB_NAMES.ingestReadings, {
  deviceId: 'device-001',
  from: '2026-08-19T00:00:00Z',
  to: '2026-08-20T00:00:00Z',
})
```

`enqueue()` validates the payload against its contract before it reaches Redis, so a bad payload
fails where you can still see the error rather than inside a Python processor.

## Scheduling

Recurring jobs are declared once in `src/schedules.ts`. How they _fire_ is a separate decision, and
the scaffold supports both options without touching a processor:

| Mechanism        | How                                                                       | Fits                                                        |
| ---------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------- |
| BullMQ scheduler | `pnpm jobs:register` writes the entries into Redis                        | A deployment with a long-running process                    |
| External cron    | `POST /api/jobs/[name]/trigger` with `Authorization: Bearer $CRON_SECRET` | Vercel Cron, GitHub Actions, Kubernetes CronJob, serverless |

```bash
pnpm jobs:register                      # sync src/schedules.ts into Redis (idempotent)
pnpm --filter @lasce/jobs schedules     # list what is registered and when it fires next
```

`register-schedules.ts` also removes schedulers that are no longer declared, so deleting an entry
from the source file is enough to stop it.

## Defaults

Every job gets three attempts with exponential backoff, completed jobs are kept for 24 hours and
failed ones for 7 days (`defaultJobOptions` in `src/queue.ts`). Override per call with the third
argument to `enqueue()`.
