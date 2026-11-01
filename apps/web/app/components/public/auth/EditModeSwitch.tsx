'use client'

import { useTranslations } from 'next-intl'

import { Toggle } from '@/app/components/public/Toggle'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'

export interface EditModeSwitchProps {
  /** Distinguishes the desktop and mobile copies, which can both be in the DOM. */
  id: string
  className?: string
}

/**
 * The "Modo edición" switch of the signed-in account menu, on desktop and in the mobile menu. It
 * reads and writes the shared `EditModeProvider`, so flipping it updates the current page at once
 * and the choice survives navigation and reload. The caller decides who sees it
 * (`canEditContent`); a click here never closes the dropdown around it.
 */
export function EditModeSwitch({ id, className }: EditModeSwitchProps) {
  const t = useTranslations('account')
  const { editMode, setEditMode } = useEditMode()

  return (
    <div className={className}>
      <Toggle checked={editMode} id={id} label={t('editMode')} onChange={setEditMode} />
    </div>
  )
}
