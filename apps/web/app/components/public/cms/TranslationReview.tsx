'use client'

import { useId } from 'react'

import { Notice } from '@/app/components/public/Notice'
import { Toggle } from '@/app/components/public/Toggle'

export interface TranslationReviewProps {
  /**
   * Why the field needs attention: `reviewMessage` (`app/lib/i18n/content/review.ts`).
   * Omitted when the field's own error already says what to do.
   */
  message?: string
  /** The switch's label: `confirmationLabel` from the same module. */
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

/**
 * Shown under a translatable field whose counterpart changed in another language: the reason,
 * and a switch to confirm that this language's text is still correct. The editor either updates
 * the field or turns the switch on; the confirmation only applies to the current save.
 */
export function TranslationReview({ message, label, checked, onChange }: TranslationReviewProps) {
  const id = useId()

  return (
    <div className="cms-translation-review">
      {message ? <Notice tone="warning">{message}</Notice> : null}
      <Toggle checked={checked} id={id} label={label} onChange={onChange} />
    </div>
  )
}
