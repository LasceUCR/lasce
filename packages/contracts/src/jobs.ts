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
  queryGoesArchive: 'query-goes-archive',
} as const

export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES]

export const JOB_NAME_VALUES = Object.values(JOB_NAMES) as JobName[]

/** Pulls a time window of raw readings for one device and writes them to InfluxDB. */
export const ingestReadingsPayload = z.object({
  deviceId: z.string().min(1),
  from: z.iso.datetime({ offset: true }),
  to: z.iso.datetime({ offset: true }),
})

/** One UTC day of observed GOES L1b data from the CITIC archive. */
export const queryGoesArchivePayload = z.object({
  product: z.enum(['SFXR', 'SFEU', 'GEOF', 'MPSH', 'SGPS']),
  parameter: z.string().min(1).max(64),
  date: z.iso.date(),
  startTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
})

/** Lookup table used by `enqueue()` and by the HTTP trigger route to validate input. */
export const jobPayloads = {
  [JOB_NAMES.ingestReadings]: ingestReadingsPayload,
  [JOB_NAMES.queryGoesArchive]: queryGoesArchivePayload,
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
