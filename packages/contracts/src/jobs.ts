import { z } from 'zod'

/**
 * The single source of truth for what can be put on the queue.
 *
 * The producer is TypeScript (`apps/web`) and the consumer is Python
 * (`apps/worker`), so nothing but this file keeps the two ends agreeing on the
 * shape of a payload. Run `pnpm contracts:export` after any change here: it
 * writes the JSON Schema that the worker's test suite checks its Pydantic
 * models against, which is what turns a silent drift into a failing test.
 */
export const JOB_NAMES = {
  ingestReadings: 'ingest-readings',
  processFile: 'process-file',
  dailyRollup: 'daily-rollup',
} as const

export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES]

export const JOB_NAME_VALUES = Object.values(JOB_NAMES) as JobName[]

/** Pulls a time window of raw readings for one device and writes them to InfluxDB. */
export const ingestReadingsPayload = z.object({
  deviceId: z.string().min(1),
  from: z.iso.datetime({ offset: true }),
  to: z.iso.datetime({ offset: true }),
})

/** Reads an object from MinIO, processes it, and writes the result back. */
export const processFilePayload = z.object({
  objectKey: z.string().min(1),
  contentType: z.string().min(1).default('application/octet-stream'),
})

/** Cron job: aggregates yesterday's readings from InfluxDB into PostgreSQL. */
export const dailyRollupPayload = z.object({
  /** Day to aggregate, `YYYY-MM-DD`. Defaults to the previous day in the worker. */
  date: z.iso.date().optional(),
})

/** Lookup table used by `enqueue()` and by the HTTP trigger route to validate input. */
export const jobPayloads = {
  [JOB_NAMES.ingestReadings]: ingestReadingsPayload,
  [JOB_NAMES.processFile]: processFilePayload,
  [JOB_NAMES.dailyRollup]: dailyRollupPayload,
} as const satisfies Record<JobName, z.ZodType>

export type JobPayloads = {
  [K in JobName]: z.infer<(typeof jobPayloads)[K]>
}

/** The payload type for one specific job name. */
export type JobPayload<K extends JobName> = JobPayloads[K]

/** Narrows an arbitrary string to a known job name. */
export function isJobName(value: string): value is JobName {
  return JOB_NAME_VALUES.includes(value as JobName)
}
