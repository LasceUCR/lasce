'use client'

import { useTranslations } from 'next-intl'
import { useCallback, useRef } from 'react'

import { readFailureReason } from '@/app/lib/api-feedback'

import { useToast } from './ToastProvider'

export interface RequestFeedbackOptions {
  /** The success toast, e.g. "Noticia agregada correctamente." */
  success: string
  /** Shown when a failure below 500 gives no reason, e.g. "No se pudo guardar la noticia." */
  fallback: string
  /** Runs once the request succeeded, before the success toast: close the form, refresh. */
  onSuccess?: (response: Response) => void | Promise<void>
  /** Entity-specific, localized failure text. Receives a clone so the default reader still works. */
  describeFailure?: (response: Response) => Promise<string | null>
}

export type SendWithFeedback = (
  url: string,
  init: RequestInit,
  options: RequestFeedbackOptions,
) => Promise<boolean>

/**
 * Sends a request to a JSON route handler and reports the outcome in a toast, the same way in
 * every section (see `docs/toasts.md`).
 *
 * - Success runs `onSuccess`, then shows `success`.
 * - A failure shows the server's reason (`readFailureReason`) or, when it gave none, a network,
 *   server or `fallback` message. Nothing else happens, so a form stays open with its input.
 * - Each attempt dismisses the error the previous one left, so retries do not pile up.
 *
 * Resolves to whether the request succeeded.
 */
export function useRequestFeedback(): SendWithFeedback {
  const toast = useToast()
  const t = useTranslations('common.feedback')
  const lastError = useRef<number | null>(null)

  return useCallback<SendWithFeedback>(
    async (url, init, { success, fallback, onSuccess, describeFailure }) => {
      if (lastError.current !== null) {
        toast.dismiss(lastError.current)
        lastError.current = null
      }

      let response: Response
      try {
        response = await fetch(url, init)
      } catch {
        lastError.current = toast.show('error', t('network'))
        return false
      }

      if (!response.ok) {
        const resForFailure = typeof response.clone === 'function' ? response.clone() : response
        const reason =
          (describeFailure ? await describeFailure(resForFailure) : null) ??
          (await readFailureReason(response)) ??
          (response.status >= 500 ? t('server') : fallback)
        lastError.current = toast.show('error', reason)
        return false
      }

      const resForSuccess = typeof response.clone === 'function' ? response.clone() : response
      await onSuccess?.(resForSuccess)
      toast.show('success', success)
      return true
    },
    [toast, t],
  )
}
