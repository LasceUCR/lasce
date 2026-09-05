export interface PublicationCardProps {
  title: string
  authors: string
  venue: string
  year: string
  abstract: string
  href: string
}

export function PublicationCard({ title, authors, venue, year, abstract, href }: PublicationCardProps) {
  return (
    <article className="publication-card">
      <h3>{title}</h3>
      <p className="publication-meta">
        {authors} · {venue} · {year}
      </p>
      <p className="publication-abstract">{abstract}</p>
      <a className="area-link" href={href} rel="noreferrer" target="_blank">
        DOI / Enlace externo <span aria-hidden="true">→</span>
      </a>
    </article>
  )
}
