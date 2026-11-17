'use client'

import { useEffect, useRef } from 'react'

import type { ToastTone } from './Toast'
import { useToast } from './ToastProvider'

export interface FlashToastProps {
  /** The text of the toast, already in the visitor's language. */
  message: string
  tone?: ToastTone
  /**
   * The query parameter that asked for this toast. It is removed from the address bar once the
   * toast shows, so reloading or sharing the page does not show it again.
   */
  clearParam?: string
}

/**
 * Shows one toast when the page loads, for the outcome of something that finished on another
 * page: a password reset redirects to the access page with `?restablecida=1`, and the page
 * renders this. It renders nothing itself.
 */
export function FlashToast({ message, tone = 'success', clearParam }: FlashToastProps) {
  const toast = useToast()
  const shown = useRef(false)

  useEffect(() => {
    // Development mode runs effects twice; the toast must still appear once.
    if (shown.current) return
    shown.current = true
    toast.show(tone, message)

    if (clearParam) {
      const url = new URL(window.location.href)
      if (url.searchParams.has(clearParam)) {
        url.searchParams.delete(clearParam)
        window.history.replaceState(window.history.state, '', url)
      }
    }
  }, [toast, tone, message, clearParam])

  return null
}
