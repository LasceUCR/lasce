'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'

export interface TruncatedTextProps {
  /** The text to show, cut to `lines` until expanded. */
  children: string
  /** How many lines show before the text is cut. */
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

/** The height of one line of `element`, in pixels, or `null` when it cannot be read. */
function lineHeightOf(element: HTMLElement): number | null {
  const style = getComputedStyle(element)
  const lineHeight = Number.parseFloat(style.lineHeight)
  if (Number.isFinite(lineHeight) && lineHeight > 0) return lineHeight
  // `normal` is about 1.2 times the font size in every browser.
  const fontSize = Number.parseFloat(style.fontSize)
  return Number.isFinite(fontSize) && fontSize > 0 ? fontSize * 1.2 : null
}

/**
 * A piece of text cut after a number of lines, with an inline "… Leer más" at the end of the
 * last line that shows the whole text in place, followed by "Leer menos" to cut it again. Use it
 * for any field that can be long:
 *
 * ```tsx
 * <TruncatedText lines={3}>{area.description}</TruncatedText>
 * ```
 *
 * The toggle only appears when the text does not fit in `lines` (measured, so it follows the
 * width the text gets and short text stays exactly as it was). The whole text is always in the
 * page, so search and assistive technology read all of it; the toggle is a disclosure button
 * (`aria-expanded`, `aria-controls`) whose labels follow the site's language.
 *
 * How the inline toggle is placed: the text box is cut to `lines` lines of height, and an empty
 * float as tall as all but the last line pushes the toggle, floated right, onto the last visible
 * line, so the text wraps around it (see `.truncated-text-*` in `globals.css`).
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
  const bodyRef = useRef<HTMLSpanElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)
  const [lineHeight, setLineHeight] = useState<number | null>(null)

  useEffect(() => {
    const body = bodyRef.current

    // While expanded nothing is cut, so a measurement would always report no overflow.
    if (!body || expanded || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => {
      setLineHeight(lineHeightOf(body))
      setOverflows(body.scrollHeight > body.clientHeight + 1)
    })
    observer.observe(body)

    return () => observer.disconnect()
  }, [children, expanded, lines])

  const clamped = !expanded
  const style = clamped
    ? ({
        '--truncated-lines': lines,
        ...(lineHeight ? { '--truncated-line-height': `${lineHeight}px` } : {}),
      } as CSSProperties)
    : undefined

  const toggle = (label: string) => (
    <button
      aria-controls={textId}
      aria-expanded={expanded}
      className="truncated-text-toggle"
      onClick={() => setExpanded((current) => !current)}
      type="button"
    >
      {label}
    </button>
  )

  return (
    <Element
      className={['truncated-text', className].filter(Boolean).join(' ')}
      id={textId}
      lang={lang}
    >
      <span
        className={['truncated-text-body', clamped ? 'is-clamped' : ''].filter(Boolean).join(' ')}
        ref={bodyRef}
        style={style}
      >
        {clamped && overflows ? (
          // Before the text in the source, so it can float onto the last visible line.
          <span className="truncated-text-more">
            <span aria-hidden="true">… </span>
            {toggle(readMoreLabel ?? t('readMore'))}
          </span>
        ) : null}
        {children}
        {expanded ? <> {toggle(readLessLabel ?? t('readLess'))}</> : null}
      </span>
    </Element>
  )
}
