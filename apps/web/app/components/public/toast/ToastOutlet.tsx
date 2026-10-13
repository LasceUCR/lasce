'use client'

import { useContext, useEffect, useId } from 'react'

import { ToastOutletContext } from './ToastProvider'
import { ToastRegion } from './ToastRegion'

/**
 * A place toasts can render besides the page itself. `Modal` mounts one inside its `<dialog>`,
 * so a toast shown while the modal is open is part of it rather than inert behind it. Only the
 * most recently mounted outlet shows the toasts. Without a `ToastProvider` it renders nothing.
 */
export function ToastOutlet() {
  const registry = useContext(ToastOutletContext)
  const outletId = useId()
  const register = registry?.register

  useEffect(() => register?.(outletId), [register, outletId])

  if (!registry) return null

  return (
    <ToastRegion
      onDismiss={registry.dismiss}
      toasts={registry.topOutlet === outletId ? registry.toasts : []}
    />
  )
}
