import Image from 'next/image'

export interface NewsCardProps {
  title: string
  authors: string
  source: string
  date: string
  abstract: string
  href: string
  imageUrl: string
}

export function NewsCard({
  title,
  authors,
  source,
  date,
  abstract,
  href,
  imageUrl,
}: NewsCardProps) {
  return (
    <article className="surface-card news-card">
      <div className="news-card-image">
        <Image alt={title} fill sizes="(max-width: 768px) 100vw, 320px" src={imageUrl} />
      </div>

      <div className="news-card-content">
        <h3>{title}</h3>

        <p className="news-meta">
          {authors} · {source} · {date}
        </p>

        {abstract && <p className="news-abstract">{abstract}</p>}

        {href && (
          <a className="area-link" href={href} rel="noopener noreferrer" target="_blank">
            Abrir fuente <span aria-hidden="true">→</span>
          </a>
        )}
      </div>
    </article>
  )
}
