'use server'

import { getPermissionsForRole } from '@/app/lib/auth/permission-store'
import { getSessionUser } from '@/app/lib/auth/session'
import {
  createResourceDownload,
  type ResourceDownloadResult,
} from '@/app/services/downloads/downloadService'
import { ScientificDataUpstreamError } from '@/app/services/scientific-data/errors'

export type RequestResourceDownloadResult =
  ResourceDownloadResult | { ok: false; reason: 'unauthenticated' | 'failed'; message: string }

/**
 * Generates a chart image or data export for the query shown on `/datos` and returns a
 * 30-minute link to it. Every check lives in `createResourceDownload`; the buttons on the page
 * only mirror them.
 */
export async function requestResourceDownload(
  request: unknown,
): Promise<RequestResourceDownloadResult> {
  const user = await getSessionUser()
  if (!user) {
    return {
      ok: false,
      reason: 'unauthenticated',
      message: 'Inicie sesión para descargar recursos.',
    }
  }

  try {
    return await createResourceDownload({
      userId: user.id,
      grants: await getPermissionsForRole(user.role),
      request,
    })
  } catch (error) {
    if (error instanceof ScientificDataUpstreamError) {
      console.error(`Resource download upstream error: ${error.message}`)
      return {
        ok: false,
        reason: 'failed',
        message: 'No fue posible consultar la fuente científica. Inténtelo nuevamente más tarde.',
      }
    }
    console.error('Resource download failed', error)
    return {
      ok: false,
      reason: 'failed',
      message: 'No fue posible preparar la descarga. Inténtelo nuevamente más tarde.',
    }
  }
}
