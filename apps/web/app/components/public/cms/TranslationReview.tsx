'use client'

import { useId } from 'react'

import { Notice } from '@/app/components/public/Notice'
import { Toggle } from '@/app/components/public/Toggle'

export interface TranslationReviewProps {
  /** Why the field needs attention: `reviewMessage` (`app/lib/i18n/content/review.ts`). */
  message: string
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
      <Notice tone="warning">{message}</Notice>
      <Toggle checked={checked} id={id} label={label} onChange={onChange} />
    </div>
  )
}
