'use server'

import { getLocale, getMessages, getTranslations } from 'next-intl/server'

import { permissionText, type AccessMessages } from '@/app/lib/access-messages'
import { getPermissionsForRole } from '@/app/lib/auth/permission-store'
import { getSessionUser } from '@/app/lib/auth/session'
import type { ScientificDataMessages } from '@/app/lib/scientific-data'
import {
  createResourceDownload,
  type ResourceDownloadResult,
} from '@/app/services/downloads/downloadService'
import { exportCopy } from '@/app/services/downloads/exporters'
import { ScientificDataUpstreamError } from '@/app/services/scientific-data/errors'

type ResourceDownloadRefusal = Extract<ResourceDownloadResult, { ok: false }>

export type RequestResourceDownloadResult =
  | Extract<ResourceDownloadResult, { ok: true }>
  | (Pick<ResourceDownloadRefusal, 'ok' | 'reason'> & { message: string })
  | { ok: false; reason: 'unauthenticated' | 'failed'; message: string }

const REFUSAL_MESSAGES = {
  invalid: 'downloadInvalid',
  futureDate: 'dateNotFuture',
  unsupported: 'downloadUnsupported',
  pending: 'downloadPending',
  empty: 'downloadEmpty',
} as const

/**
 * Generates a chart image or data export for the query shown on `/datos` and returns a
 * 30-minute link to it. Every check lives in `createResourceDownload`; the buttons on the page
 * only mirror them.
 */
export async function requestResourceDownload(
  request: unknown,
): Promise<RequestResourceDownloadResult> {
  const t = await getTranslations('scientificData.errors')
  const user = await getSessionUser()
  if (!user) {
    return {
      ok: false,
      reason: 'unauthenticated',
      message: t('downloadUnauthenticated'),
    }
  }

  try {
    const [locale, messages] = await Promise.all([getLocale(), getMessages()])
    const outcome = await createResourceDownload({
      userId: user.id,
      grants: await getPermissionsForRole(user.role),
      request,
      copy: exportCopy(locale, messages as ScientificDataMessages),
    })
    if (outcome.ok) return outcome
    return {
      ok: false,
      reason: outcome.reason,
      message:
        outcome.reason === 'forbidden'
          ? permissionText(outcome.permission, messages as AccessMessages).denied
          : t(REFUSAL_MESSAGES[outcome.reason]),
    }
  } catch (error) {
    if (error instanceof ScientificDataUpstreamError) {
      console.error(`Resource download upstream error: ${error.message}`)
      return {
        ok: false,
        reason: 'failed',
        message: t('upstreamError'),
      }
    }
    console.error('Resource download failed', error)
    return {
      ok: false,
      reason: 'failed',
      message: t('downloadFailed'),
    }
  }
}
