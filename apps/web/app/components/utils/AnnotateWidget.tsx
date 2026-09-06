'use client'

import { useEffect } from 'react'
import { destroy, init } from '@webdots/annotate-client'
import { usePathname } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_WEBDOTS_API_URL as string | undefined
const API_KEY = process.env.NEXT_PUBLIC_WEBDOTS_API_KEY as string | undefined

/**
 * Mounts the Webdots annotation widget in the app. If NEXT_PUBLIC_WEBDOTS_API_URL is not set, the component does nothing, so production is clean by default.

 * The widget resolves its `pageKey` only once, in `init()`, against the current
 * `location`; that's why we remount it on every route change instead of calling
 * `refresh()`.
 *
 * Note: cleanup uses the module's `destroy()`, not `widget.destroy()`. The
 * instance method does not free the library's internal singleton, so the next
 * `init()` (for example the double effect of StrictMode) would return the
 * already destroyed instance and the widget would not reappear.
 */
export function AnnotateWidget() {
  const pathname = usePathname()

  useEffect(() => {
    if (!API_URL) return

    const widget = init({
      apiUrl: API_URL,
      apiKey: API_KEY,
    })

    widget.refresh()

    return () => destroy()
  }, [pathname])

  return null
}
