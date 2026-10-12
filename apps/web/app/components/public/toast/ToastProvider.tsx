'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import type { ToastTone } from './Toast'
import { ToastRegion, type ToastItem } from './ToastRegion'

/** How long a success toast stays up. Errors stay until dismissed, so nobody is rushed. */
export const SUCCESS_TOAST_DURATION_MS = 5000

const BASE_OUTLET = 'base'

export interface ToastApi {
  /** Shows a toast and returns its id, for `dismiss`. */
  show: (tone: ToastTone, message: string) => number
  dismiss: (id: number) => void
}

export interface ToastOutletRegistry {
  register: (outletId: string) => () => void
  topOutlet: string
  toasts: ToastItem[]
  dismiss: (id: number) => void
}

/** A toast plus the outlet that was on top when it was shown. */
interface StoredToast extends ToastItem {
  origin: string
}

const ToastApiContext = createContext<ToastApi | null>(null)

export const ToastOutletContext = createContext<ToastOutletRegistry | null>(null)

export function useToast(): ToastApi {
  const api = useContext(ToastApiContext)
  if (!api) {
    throw new Error('useToast must be used inside <ToastProvider>.')
  }
  return api
}

export interface ToastProviderProps {
  children: ReactNode
}

/**
 * Holds the app's toasts and decides where they render. `Modal` opens with `showModal()`, which
 * makes everything outside the dialog inert: a toast in `<body>` could be neither clicked nor
 * announced while a form is open. So every open `Modal` mounts a `ToastOutlet`, and the toasts
 * render in the most recently opened one, or in this provider's own region when none is open.
 */
export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<StoredToast[]>([])
  const [outlets, setOutlets] = useState<string[]>([])
  // Read synchronously by `show`, which may run before a re-render reflects the latest outlets.
  const outletsRef = useRef<string[]>([])
  const nextId = useRef(0)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  useEffect(() => {
    const pending = timers.current
    return () => {
      pending.forEach((timer) => clearTimeout(timer))
      pending.clear()
    }
  }, [])

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const show = useCallback(
    (tone: ToastTone, message: string) => {
      nextId.current += 1
      const id = nextId.current
      const origin = outletsRef.current.at(-1) ?? BASE_OUTLET
      setToasts((current) => [...current, { id, tone, message, origin }])
      if (tone === 'success') {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), SUCCESS_TOAST_DURATION_MS),
        )
      }
      return id
    },
    [dismiss],
  )

  const register = useCallback((outletId: string) => {
    outletsRef.current = [...outletsRef.current, outletId]
    setOutlets(outletsRef.current)

    return () => {
      outletsRef.current = outletsRef.current.filter((id) => id !== outletId)
      setOutlets(outletsRef.current)
      // An error raised inside a modal is about that modal's form, so it closes with it. A
      // success shown as the modal closes is kept and moves to the next outlet down.
      setToasts((current) =>
        current.filter((toast) => !(toast.tone === 'error' && toast.origin === outletId)),
      )
    }
  }, [])

  const api = useMemo<ToastApi>(() => ({ show, dismiss }), [show, dismiss])
  const topOutlet = outlets.at(-1) ?? BASE_OUTLET
  const registry = useMemo<ToastOutletRegistry>(
    () => ({ register, topOutlet, toasts, dismiss }),
    [register, topOutlet, toasts, dismiss],
  )

  return (
    <ToastApiContext.Provider value={api}>
      <ToastOutletContext.Provider value={registry}>
        {children}
        <ToastRegion onDismiss={dismiss} toasts={topOutlet === BASE_OUTLET ? toasts : []} />
      </ToastOutletContext.Provider>
    </ToastApiContext.Provider>
  )
}
