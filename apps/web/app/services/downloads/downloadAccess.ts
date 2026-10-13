import { z } from 'zod'

import { PERMISSION_DENIED, type Permission } from '@/app/lib/auth/permissions'
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
  format: z.enum(DOWNLOAD_FORMATS, { error: 'Seleccione un formato de descarga válido.' }),
  /** The asynchronous job that already answered the query on the page, when there was one. */
  jobId: z.string().min(1).max(200).optional(),
})

export type ResourceDownloadRequest = z.input<typeof resourceDownloadRequestSchema>

export type DownloadAccessFailureReason = 'invalid' | 'unsupported' | 'forbidden'

export interface DownloadAccessDenied {
  ok: false
  reason: DownloadAccessFailureReason
  message: string
}

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
  if (!parsed.success) {
    return {
      ok: false,
      reason: 'invalid',
      message: parsed.error.issues[0]?.message ?? 'La solicitud no es válida.',
    }
  }
  const { query, format, jobId } = parsed.data

  const availabilityMessage = getAvailabilityMessage(query, getGoesAvailability(now))
  if (availabilityMessage) return { ok: false, reason: 'invalid', message: availabilityMessage }

  const decision = decideDownload(query, format, grants)
  if (decision.status === 'unsupported') {
    return {
      ok: false,
      reason: 'unsupported',
      message: 'Este producto no ofrece descargas en el formato solicitado.',
    }
  }
  if (decision.status === 'forbidden') {
    return { ok: false, reason: 'forbidden', message: PERMISSION_DENIED[decision.missing.at(-1)!] }
  }

  return {
    ok: true,
    query,
    format,
    instrument: decision.instrument,
    ...(jobId ? { jobId } : {}),
  }
}
