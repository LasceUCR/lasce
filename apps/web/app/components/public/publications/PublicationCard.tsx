import { ExternalLink } from 'lucide-react'

import { Button } from '@/app/components/public/Button'
import type { ResearchGroup } from '@/app/lib/publications'

export interface PublicationCardProps {
  title: string
  authors: string
  venue: string
  year: string
  researchGroup: ResearchGroup
  abstract: string
  href?: string
}

export function PublicationCard({
  title,
  authors,
  venue,
  year,
  researchGroup,
  abstract,
  href,
}: PublicationCardProps) {
  return (
    <article className="surface-card publication-card">
      <h3>{title}</h3>

      <p className="publication-meta">
        {authors && `${authors} · `}
        {venue} · {year} ·{' '}
        <strong className="publication-group">{researchGroup}</strong>
      </p>

      <p className={`publication-abstract${href ? '' : ' publication-abstract-full'}`}>
        {abstract}
      </p>

      {href && (
        <Button
          href={href}
          icon={<ExternalLink aria-hidden="true" size={16} strokeWidth={1.8} />}
          rel="noopener noreferrer"
          target="_blank"
          variant="primary"
        >
          DOI / Enlace externo
        </Button>
      )}
    </article>
  )
}
