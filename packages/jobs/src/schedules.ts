import type { JobName, JobPayloads } from '@lasce/contracts'

export interface Schedule<K extends JobName = JobName> {
  /** Stable identifier for the scheduler entry. Renaming it creates a new one. */
  id: string
  name: K
  /** Standard five-field cron expression, evaluated in `timezone`. */
  cron: string
  timezone?: string
  data: JobPayloads[K]
}

/**
 * Every recurring job in the system, declared in one place.
 *
 * This list is intentionally independent of *how* the schedule fires. Two
 * mechanisms read it and both end up calling the same processors:
 *
 *   1. BullMQ's own scheduler — `pnpm jobs:register` writes these entries into
 *      Redis, which then enqueues them on time. Use this when something in your
 *      deployment runs continuously.
 *   2. An external cron caller — Vercel Cron, a GitHub Actions workflow, a
 *      Kubernetes CronJob — hitting `POST /api/jobs/[name]/trigger`. Use this on
 *      serverless, where nothing is guaranteed to stay alive.
 *
 * Switching between the two does not touch a single processor.
 */
export const schedules: Schedule[] = [
  {
    id: 'suvi-pipeline-fe093',
    name: 'suvi-pipeline',
    cron: '*/1 * * * *',
    data: {
      channel: 'Fe093',
      spacecraft: 19,
      lookbackMinutes: 30,
    },
  },
  {
    id: 'suvi-pipeline-fe131',
    name: 'suvi-pipeline',
    cron: '*/1 * * * *',
    data: {
      channel: 'Fe131',
      spacecraft: 19,
      lookbackMinutes: 30,
    },
  },
  {
    id: 'suvi-pipeline-fe171',
    name: 'suvi-pipeline',
    cron: '*/1 * * * *',
    data: {
      channel: 'Fe171',
      spacecraft: 19,
      lookbackMinutes: 30,
    },
  },
  {
    id: 'suvi-pipeline-fe195',
    name: 'suvi-pipeline',
    cron: '*/1 * * * *',
    data: {
      channel: 'Fe195',
      spacecraft: 19,
      lookbackMinutes: 30,
    },
  },
  {
    id: 'suvi-pipeline-fe284',
    name: 'suvi-pipeline',
    cron: '*/1 * * * *',
    data: {
      channel: 'Fe284',
      spacecraft: 19,
      lookbackMinutes: 30,
    },
  },  
]
