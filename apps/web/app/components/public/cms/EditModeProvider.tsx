'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'

const STORAGE_KEY = 'lasce:cms-edit-mode'

export interface EditModeContextValue {
  editMode: boolean
  setEditMode: Dispatch<SetStateAction<boolean>>
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
 */
export function EditModeProvider({ children }: EditModeProviderProps) {
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    try {
      setEditMode(window.localStorage.getItem(STORAGE_KEY) === 'true')
    } catch {
      // Storage unavailable (private browsing, disabled cookies/storage): the
      // toggle still works for the current page, it just won't persist.
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(editMode))
    } catch {
      // Same as above — nothing to do if storage can't be written.
    }
  }, [editMode])

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
