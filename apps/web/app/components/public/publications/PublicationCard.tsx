import { ExternalLink } from 'lucide-react'

import { Button } from '@/app/components/public/Button'

export interface PublicationCardProps {
  title: string
  authors: string
  venue: string
  year: string
  abstract: string
  href: string
}

export function PublicationCard({
  title,
  authors,
  venue,
  year,
  abstract,
  href,
}: PublicationCardProps) {
  return (
    <article className="surface-card publication-card">
      <h3>{title}</h3>

      <p className="publication-meta">
        {authors} · {venue} · {year}
      </p>

      <p className="publication-abstract">{abstract}</p>

      <Button
        href={href}
        icon={<ExternalLink aria-hidden="true" size={16} strokeWidth={1.8} />}
        rel="noopener noreferrer"
        target="_blank"
        variant="external"
      >
        DOI / Enlace externo
      </Button>
    </article>
  )
}
