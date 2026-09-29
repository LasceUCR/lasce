'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'lasce:cms-edit-mode'

export interface EditModeContextValue {
  editMode: boolean
  setEditMode: (editMode: boolean) => void
}

// Exported so stories/tests can preset a value directly
// (`<EditModeContext.Provider value={{ editMode: true, ... }}>`) without
// going through real toggling or localStorage.
export const EditModeContext = createContext<EditModeContextValue | undefined>(undefined)

export interface EditModeProviderProps {
  children: ReactNode
}

/**
 * Shares the "Modo edición" toggle between `/administracion` (where it's
 * switched on) and any public page that wraps its editable content in
 * `EditableWrapper` (where it takes effect). Mounted once in the root
 * layout, so it survives client-side navigation between the two. Persisted
 * to `localStorage` so it also survives a reload — there's no backend yet
 * to persist it against.
 *
 * Reading and writing used to be two separate effects — one to load the
 * stored value on mount, another that wrote `editMode` back out on every
 * change. React (Strict Mode, in development) deliberately runs a fresh
 * mount's effects twice, and the two effects would interleave across that
 * double invocation: the write effect fired with the *first* run's still-
 * default `false`, overwriting the value the read effect had just found,
 * before the read effect's second run could see anything but that
 * just-overwritten `false`. In effect, a stored `true` never survived
 * mounting the provider under Strict Mode — the toggle looked like it reset
 * on every reload. Writing only from `setEditMode` itself, never reactively
 * off state, removes that race: loading the stored value can no longer
 * trigger a write at all.
 */
export function EditModeProvider({ children }: EditModeProviderProps) {
  const [editMode, setEditModeState] = useState(false)

  useEffect(() => {
    try {
      setEditModeState(window.localStorage.getItem(STORAGE_KEY) === 'true')
    } catch {
      // Storage unavailable (private browsing, disabled cookies/storage): the
      // toggle still works for the current page, it just won't persist.
    }
  }, [])

  function setEditMode(next: boolean): void {
    setEditModeState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next))
    } catch {
      // Same as above — nothing to do if storage can't be written.
    }
  }

  return (
    <EditModeContext.Provider value={{ editMode, setEditMode }}>
      {children}
    </EditModeContext.Provider>
  )
}

export function useEditMode(): EditModeContextValue {
  const context = useContext(EditModeContext)
  if (!context) {
    throw new Error('useEditMode must be used within an EditModeProvider')
  }
  return context
}
