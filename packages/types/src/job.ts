/**
 * The lifecycle states BullMQ reports for a job. Mirrors the strings returned by
 * `job.getState()` so the UI can render them without a translation layer.
 */
export type JobState =
  | 'completed'
  | 'failed'
  | 'active'
  | 'delayed'
  | 'prioritized'
  | 'waiting'
  | 'waiting-children'
  | 'unknown'

/** What `GET /api/jobs/[id]` returns to the browser. */
export interface JobStatus {
  id: string
  name: string
  state: JobState
  /** 0-100, reported by the worker through `job.updateProgress()`. */
  progress: number
  attemptsMade: number
  /** Present once the processor returns a value. */
  returnValue: unknown
  /** Present when the job ended in `failed`. */
  failedReason: string | null
  createdAt: string
  finishedAt: string | null
}
