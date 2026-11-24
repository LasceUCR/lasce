'use client'

import { TruncatedText } from '@/app/components/public/TruncatedText'

import styles from './InitiativeDescription.module.css'

/** How many lines of an initiative's description show before "Leer más". */
export const INITIATIVE_PREVIEW_LINES = 4

export interface InitiativeDescriptionProps {
  paragraphs: readonly string[]
}

/**
 * An initiative's description, cut after a few lines with the shared inline "Leer más". The
 * paragraphs are joined with a blank line, which `white-space: pre-line` keeps once it is whole.
 */
export function InitiativeDescription({ paragraphs }: InitiativeDescriptionProps) {
  return (
    <TruncatedText className={`topic-intro ${styles.description}`} lines={INITIATIVE_PREVIEW_LINES}>
      {paragraphs.join('\n\n')}
    </TruncatedText>
  )
}
