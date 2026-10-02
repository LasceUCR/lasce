'use server'

import { getPermissionsForRole } from '@/app/lib/auth/permission-store'
import { getSessionUser } from '@/app/lib/auth/session'
import {
  validateResourceDownload,
  type DownloadAccessDenied,
} from '@/app/services/downloads/downloadAccess'

export type RequestResourceDownloadResult =
  | { ok: true; url: string; filename: string; expiresAt: string }
  | DownloadAccessDenied
  | { ok: false; reason: 'unauthenticated' | 'unavailable'; message: string }

/**
 * Validates a download from `/datos`: a session, then the user's current grants against the
 * download policy. Every attempt is checked again here; the buttons on the page only mirror it.
 * Producing the file itself is not implemented yet, so a validated request is answered with
 * `unavailable`.
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

  const access = validateResourceDownload(request, await getPermissionsForRole(user.role))
  if (!access.ok) return access

  return {
    ok: false,
    reason: 'unavailable',
    message: 'La generación de archivos de descarga todavía no está disponible.',
  }
}
