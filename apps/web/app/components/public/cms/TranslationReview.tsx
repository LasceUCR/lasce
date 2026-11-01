'use client'

import { useId } from 'react'

import { Toggle } from '@/app/components/public/Toggle'

export interface TranslationReviewProps {
  /**
   * Kept for callers that still pass `reviewMessage`. The field's own red error already says
   * what to do, so this text is not shown.
   */
  message?: string
  /** The switch's label: `confirmationLabel` from the same module. */
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

/**
 * Shown under a translatable field whose counterpart changed in another language. The editor
 * either updates the field or turns the switch on; the confirmation only applies to the current
 * save. The reason is the field's own error, not a second notice.
 */
export function TranslationReview({ label, checked, onChange }: TranslationReviewProps) {
  const id = useId()

  return (
    <div className="cms-translation-review">
      <Toggle checked={checked} id={id} label={label} onChange={onChange} />
    </div>
  )
}
