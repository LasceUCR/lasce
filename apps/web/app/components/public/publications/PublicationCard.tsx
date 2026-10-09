'use client'

import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

import { Button } from '@/app/components/public/Button'
import { Notice } from '@/app/components/public/Notice'
import type { ResearchGroup } from '@/app/lib/publications'

export interface PublicationCardProps {
  title: string
  authors: string
  venue: string
  year: string
  researchGroup: ResearchGroup
  abstract: string
  href?: string
  /**
   * The language `title` and `abstract` are written in, set as their `lang`. `''` means unknown
   * (a record saved before languages existed); leave it out to inherit the page's language.
   */
  contentLang?: string
  /** Shown to editors: the publication has no English version yet. */
  translationMissing?: boolean
}

/**
 * The abstract is clamped to two lines (see `.publication-abstract` in globals.css) and ends with
 * an ellipsis. A publication with an external link sends the reader there for the full text. One
 * without a link has nowhere else to read it, so when the clamp actually hides text, a "Leer
 * resumen completo" button takes the link's place in the footer and expands the abstract in place. Overflow is
 * measured with a ResizeObserver, so the button appears or disappears as the card width changes.
 */
export function PublicationCard({
  title,
  authors,
  venue,
  year,
  researchGroup,
  abstract,
  href,
  contentLang,
  translationMissing = false,
}: PublicationCardProps) {
  const abstractId = useId()
  const abstractRef = useRef<HTMLParagraphElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)

  useEffect(() => {
    const element = abstractRef.current

    // While expanded the clamp is off, so a measurement would always report no overflow.
    if (href || !element || expanded || typeof ResizeObserver === 'undefined') {
      return
    }

    const observer = new ResizeObserver(() => {
      setOverflows(element.scrollHeight > element.clientHeight + 1)
    })
    observer.observe(element)

    return () => observer.disconnect()
  }, [abstract, expanded, href])

  const canExpand = !href && (overflows || expanded)
  const abstractClassName = ['publication-abstract', expanded ? 'is-expanded' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <article className="surface-card publication-card">
      <h3 lang={contentLang}>{title}</h3>

      <p className="publication-meta">
        {authors && `${authors} · `}
        {venue} · {year} · <strong className="publication-group">{researchGroup}</strong>
      </p>

      <p className={abstractClassName} id={abstractId} lang={contentLang} ref={abstractRef}>
        {abstract}
      </p>

      {translationMissing ? (
        <Notice tone="warning">
          Sin versión en inglés. Al editar el título o el resumen se deben completar ambos idiomas.
        </Notice>
      ) : null}

      {href ? (
        <div className="publication-card-footer">
          <Button
            href={href}
            icon={<ExternalLink aria-hidden="true" size={16} strokeWidth={1.8} />}
            rel="noopener noreferrer"
            target="_blank"
            variant="primary"
          >
            DOI / Enlace externo
          </Button>
        </div>
      ) : null}

      {canExpand ? (
        <div className="publication-card-footer">
          <Button
            ariaControls={abstractId}
            ariaExpanded={expanded}
            icon={
              expanded ? (
                <ChevronUp aria-hidden="true" size={16} strokeWidth={1.8} />
              ) : (
                <ChevronDown aria-hidden="true" size={16} strokeWidth={1.8} />
              )
            }
            onClick={() => setExpanded((current) => !current)}
            variant="primary"
          >
            {expanded ? 'Ocultar resumen' : 'Leer resumen completo'}
          </Button>
        </div>
      ) : null}
    </article>
  )
}
