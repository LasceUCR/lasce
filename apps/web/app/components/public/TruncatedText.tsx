'use client'

import { useLocale, useTranslations } from 'next-intl'
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
 * The text up to the longest prefix that, followed by "… " and the toggle's label, still fits in
 * `lines` lines, or `null` when the whole text already fits. It is measured in `probe`, an
 * invisible copy of the text box, so the toggle can sit right after the last visible word instead
 * of at the right edge.
 */
function fitPrefix(probe: HTMLElement, text: string, label: string, lines: number): number | null {
  const maxHeight = lines * (lineHeightOf(probe) ?? 20) + 1
  const tail = document.createElement('span')
  tail.style.fontWeight = '600'
  tail.textContent = label

  const heightWith = (length: number) => {
    probe.replaceChildren(
      document.createTextNode(`${text.slice(0, length)}… `),
      tail.cloneNode(true),
    )
    return probe.scrollHeight
  }

  probe.replaceChildren(document.createTextNode(text))
  if (probe.scrollHeight <= maxHeight) {
    probe.replaceChildren()
    return null
  }

  let low = 0
  let high = text.length
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    if (heightWith(middle) <= maxHeight) low = middle
    else high = middle - 1
  }
  probe.replaceChildren()

  // Cut between words rather than inside one, when there is a space to cut at.
  if (low < text.length && !/\s/.test(text.charAt(low))) {
    const space = text.slice(0, low).search(/\s\S*$/)
    if (space > 0) return space
  }
  return low
}

/**
 * A piece of text cut after a number of lines, with an inline "… Leer más" right after the last
 * visible word that shows the whole text in place, followed by "Leer menos" to cut it again. Use it
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
 * How the inline toggle is placed: an invisible copy of the text box (the probe) is used to find
 * how much of the text fits in `lines` lines together with "… Leer más", and the text is shown cut
 * there, so the toggle follows the last word. The full text stays in the page, visually hidden,
 * for search and assistive technology.
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
  const uiLocale = useLocale()
  const textId = useId()
  const containerRef = useRef<HTMLElement>(null)
  const probeRef = useRef<HTMLSpanElement>(null)
  const [expanded, setExpanded] = useState(false)
  // Where the text is cut, or `null` while it fits (or has not been measured yet).
  const [cut, setCut] = useState<number | null>(null)

  const moreLabel = readMoreLabel ?? t('readMore')
  const lessLabel = readLessLabel ?? t('readLess')

  useEffect(() => {
    const container = containerRef.current
    const probe = probeRef.current

    // While expanded nothing is cut, so a measurement would always report that it fits.
    if (!container || !probe || expanded || typeof ResizeObserver === 'undefined') return

    let lastWidth = -1
    const observer = new ResizeObserver(() => {
      // Only a new width changes where the text breaks; the height changes this very effect causes
      // must not measure again.
      const width = container.getBoundingClientRect().width
      if (width === lastWidth) return
      lastWidth = width
      setCut(fitPrefix(probe, children, moreLabel, lines))
    })
    observer.observe(container)

    return () => observer.disconnect()
  }, [children, expanded, lines, moreLabel])

  const clamped = !expanded
  const style = clamped ? ({ '--truncated-lines': lines } as CSSProperties) : undefined

  const toggle = (label: string) => (
    <button
      aria-controls={textId}
      aria-expanded={expanded}
      className="truncated-text-toggle"
      lang={uiLocale}
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
      ref={containerRef as never}
    >
      <span aria-hidden="true" className="truncated-text-probe" ref={probeRef} />
      <span
        className={['truncated-text-body', clamped ? 'is-clamped' : ''].filter(Boolean).join(' ')}
        style={style}
      >
        {/* The same three slots whether cut or whole, so the toggle is one element that keeps
            keyboard focus when it flips between "Leer más" and "Leer menos". */}
        {clamped && cut !== null ? (
          <span aria-hidden="true">{children.slice(0, cut).trimEnd()}… </span>
        ) : expanded ? (
          `${children} `
        ) : (
          children
        )}
        {expanded || cut !== null ? toggle(expanded ? lessLabel : moreLabel) : null}
        {clamped && cut !== null ? <span className="sr-only">{children}</span> : null}
      </span>
    </Element>
  )
}
