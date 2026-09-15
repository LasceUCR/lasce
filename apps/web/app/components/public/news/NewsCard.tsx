import Image from 'next/image'
import { ExternalLink } from 'lucide-react'

import { Button } from '@/app/components/public/Button'

export interface NewsCardProps {
  title: string
  authors: string
  source: string
  date: string
  abstract: string
  href: string
  imageUrl: string
  imageAlt: string
}

export function NewsCard({
  title,
  authors,
  source,
  date,
  abstract,
  href,
  imageUrl,
  imageAlt,
}: NewsCardProps) {
  return (
    <article className="surface-card news-card">
      <div className={`news-card-image${imageAlt === '' ? ' news-card-image-decorative' : ''}`}>
        <Image alt={imageAlt} fill sizes="(max-width: 768px) 100vw, 320px" src={imageUrl} />
      </div>

      <div className="news-card-content">
        <h3>{title}</h3>

        <p className="news-meta">
          {authors} · {source} · {date}
        </p>

        {abstract ? <p className="news-abstract">{abstract}</p> : null}

        {href ? (
          <Button
            href={href}
            icon={<ExternalLink aria-hidden="true" size={16} strokeWidth={1.8} />}
            rel="noopener noreferrer"
            target="_blank"
            variant="external"
          >
            Abrir fuente
          </Button>
        ) : null}
      </div>
    </article>
  )
}
