'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'

export interface TruncatedTextProps {
  /** The text to show, clamped to `lines` until expanded. */
  children: string
  /** How many lines show before the text is cut with an ellipsis. */
  lines: number
  /** The element that holds the text: a paragraph by default. */
  as?: 'p' | 'div' | 'span'
  /** Classes for the text element (font, colour, margins), not for the toggle. */
  className?: string
  /**
   * The language of the text when it can differ from the page's, as in database content, from
   * `contentLangAttribute`. The toggle keeps the page's language.
   */
  lang?: string
  /** The toggle's labels. "Leer más" / "Leer menos" in the site's language by default. */
  readMoreLabel?: string
  readLessLabel?: string
}

/**
 * A piece of text clamped to a number of lines, with a "Leer más" toggle that shows the whole
 * text in place and "Leer menos" to clamp it again. Use it for any field that can be long:
 *
 * ```tsx
 * <TruncatedText lines={3}>{area.description}</TruncatedText>
 * ```
 *
 * The toggle only appears when the text does not fit in `lines` (measured, so it follows the
 * width the text gets and short text stays exactly as it was). The full text is always in the
 * page, so search and assistive technology read all of it; the toggle is a disclosure button
 * (`aria-expanded`, `aria-controls`) whose labels follow the site's language.
 */
export function TruncatedText({
  children,
  lines,
  as: Element = 'p',
  className,
  lang,
  readMoreLabel,
  readLessLabel,
}: TruncatedTextProps) {
  const t = useTranslations('common.truncatedText')
  const textId = useId()
  const textRef = useRef<HTMLElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)

  useEffect(() => {
    const element = textRef.current

    // While expanded the clamp is off, so a measurement would always report no overflow.
    if (!element || expanded || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => {
      setOverflows(element.scrollHeight > element.clientHeight + 1)
    })
    observer.observe(element)

    return () => observer.disconnect()
  }, [children, expanded, lines])

  const clamp: CSSProperties | undefined = expanded
    ? undefined
    : { WebkitLineClamp: lines, lineClamp: lines }

  return (
    <>
      <Element
        className={['truncated-text', expanded ? 'is-expanded' : '', className]
          .filter(Boolean)
          .join(' ')}
        id={textId}
        lang={lang}
        ref={(node: HTMLElement | null) => {
          textRef.current = node
        }}
        style={clamp}
      >
        {children}
      </Element>

      {overflows || expanded ? (
        <button
          aria-controls={textId}
          aria-expanded={expanded}
          className="truncated-text-toggle"
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          {expanded ? (readLessLabel ?? t('readLess')) : (readMoreLabel ?? t('readMore'))}
          {expanded ? (
            <ChevronUp aria-hidden="true" size={14} strokeWidth={1.8} />
          ) : (
            <ChevronDown aria-hidden="true" size={14} strokeWidth={1.8} />
          )}
        </button>
      ) : null}
    </>
  )
}
