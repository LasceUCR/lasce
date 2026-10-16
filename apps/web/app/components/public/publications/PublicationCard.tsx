import { ExternalLink } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/app/components/public/Button'
import { Notice } from '@/app/components/public/Notice'
import { TruncatedText } from '@/app/components/public/TruncatedText'
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
 * The abstract is clamped to two lines with the shared `TruncatedText` component — the standard
 * from `feature-g02-research-areas-read-more`, the same one `ResearchAreaCard` uses for its own
 * description — instead of a one-off clamp. Its default "Leer más"/"Leer menos" labels expand it
 * in place; the external link (DOI or otherwise) is a separate action next to it, since it
 * doesn't necessarily lead back to this abstract.
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
  // The card's own buttons and note follow the site's language; its content arrives in props.
  const t = useTranslations('publications.card')

  return (
    <article className="surface-card publication-card">
      <h3 lang={contentLang}>{title}</h3>

      <p className="publication-meta">
        {authors && `${authors} · `}
        {venue} · {year} · <strong className="publication-group">{researchGroup}</strong>
      </p>

      <TruncatedText className="publication-abstract" lang={contentLang} lines={2}>
        {abstract}
      </TruncatedText>

      {translationMissing ? <Notice tone="warning">{t('translationMissing')}</Notice> : null}

      {href ? (
        <div className="publication-card-footer">
          <Button
            href={href}
            icon={<ExternalLink aria-hidden="true" size={16} strokeWidth={1.8} />}
            rel="noopener noreferrer"
            target="_blank"
            variant="primary"
          >
            {t('externalLink')}
          </Button>
        </div>
      ) : null}
    </article>
  )
}
