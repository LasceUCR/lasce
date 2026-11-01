'use client'

import { useId, useLayoutEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import styles from './InitiativeDescription.module.css'

/** Maximum preview length, including spaces between paragraphs. */
export const INITIATIVE_PREVIEW_LIMIT = 320

export interface InitiativeDescriptionProps {
  paragraphs: readonly string[]
}

export function InitiativeDescription({ paragraphs }: InitiativeDescriptionProps) {
  const t = useTranslations('collaborations.initiatives')
  const uiLocale = useLocale()
  const id = useId()
  const [expanded, setExpanded] = useState(false)
  const description = useRef<HTMLDivElement>(null)
  const previousHeight = useRef<number | null>(null)
  const animation = useRef<Animation | null>(null)
  const text = paragraphs.join(' ')
  const expandable = text.length > INITIATIVE_PREVIEW_LIMIT
  const visibleParagraphs =
    expandable && !expanded ? [`${text.slice(0, INITIATIVE_PREVIEW_LIMIT).trimEnd()}…`] : paragraphs

  useLayoutEffect(() => {
    const element = description.current
    if (
      element?.animate &&
      previousHeight.current !== null &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      animation.current = element.animate(
        [
          { height: `${previousHeight.current}px`, overflow: 'clip' },
          { height: `${element.scrollHeight}px`, overflow: 'clip' },
        ],
        { duration: 240, easing: 'ease-in-out' },
      )
    }
    return () => animation.current?.cancel()
  }, [expanded])

  function toggle() {
    previousHeight.current = description.current?.getBoundingClientRect().height ?? null
    setExpanded((current) => !current)
  }

  return (
    <div className={styles.description} id={id} ref={description}>
      {visibleParagraphs.slice(0, -1).map((paragraph, index) => (
        <p className="topic-intro" key={index}>
          {paragraph}
        </p>
      ))}
      {/* Keep the control mounted in the same paragraph so keyboard focus survives toggling. */}
      <p className="topic-intro" key="last">
        {visibleParagraphs.at(-1)}
        {expandable && (
          <>
            {' '}
            <button
              lang={uiLocale}
              aria-controls={id}
              aria-expanded={expanded}
              className={styles.toggle}
              onClick={toggle}
              type="button"
            >
              {t(expanded ? 'readLess' : 'readMore')}
            </button>
          </>
        )}
      </p>
    </div>
  )
}
