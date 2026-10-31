import { z } from 'zod'

import type { Permission } from '@/app/lib/auth/permissions'
import { DOWNLOAD_FORMATS, type DownloadFormat } from '@/app/lib/downloads/formats'
import { decideDownload } from '@/app/lib/downloads/policy'
import {
  scientificDataQuerySchema,
  type ScientificDataQuery,
  type ScientificInstrumentCode,
} from '@/app/lib/scientific-data'
import { getAvailabilityMessage, getGoesAvailability } from '@/app/lib/scientific-data-availability'

export const resourceDownloadRequestSchema = z.object({
  query: scientificDataQuerySchema,
  format: z.enum(DOWNLOAD_FORMATS),
  /** The asynchronous job that already answered the query on the page, when there was one. */
  jobId: z.string().min(1).max(200).optional(),
})

export type ResourceDownloadRequest = z.input<typeof resourceDownloadRequestSchema>

/**
 * Why a download was refused. Only a reason, never copy: the `requestResourceDownload` Server
 * Action, which knows the visitor's language, turns it into a message.
 */
export type DownloadAccessDenied =
  | { ok: false; reason: 'invalid' | 'futureDate' | 'unsupported' }
  | { ok: false; reason: 'forbidden'; permission: Permission }

export type DownloadAccessFailureReason = DownloadAccessDenied['reason']

export interface DownloadAccessGranted {
  ok: true
  query: ScientificDataQuery
  format: DownloadFormat
  instrument: ScientificInstrumentCode
  jobId?: string
}

export type DownloadAccess = DownloadAccessGranted | DownloadAccessDenied

/**
 * Decides whether a signed-in user holding `grants` may download what `request` describes. It
 * runs on every attempt and reads nothing but its arguments, so a grant revoked a moment ago is
 * already refused. Authentication is the caller's job: an anonymous visitor never gets here.
 */
export function validateResourceDownload(
  request: unknown,
  grants: Iterable<Permission>,
  now = new Date(),
): DownloadAccess {
  const parsed = resourceDownloadRequestSchema.safeParse(request)
  if (!parsed.success) return { ok: false, reason: 'invalid' }
  const { query, format, jobId } = parsed.data

  if (getAvailabilityMessage(query, getGoesAvailability(now), 'futureDate')) {
    return { ok: false, reason: 'futureDate' }
  }

  const decision = decideDownload(query, format, grants)
  if (decision.status === 'unsupported') return { ok: false, reason: 'unsupported' }
  if (decision.status === 'forbidden') {
    return { ok: false, reason: 'forbidden', permission: decision.missing.at(-1)! }
  }

  return {
    ok: true,
    query,
    format,
    instrument: decision.instrument,
    ...(jobId ? { jobId } : {}),
  }
}
