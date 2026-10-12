import { ArrowRight, ExternalLink } from 'lucide-react'

import { Button } from '@/app/components/public/Button'

import styles from './NewsCard.module.css'

export interface NewsCardProps {
  title: string
  authors: string
  source: string
  /** The date as displayed, e.g. "24 de mayo de 2026", or "Sin fecha". */
  date: string
  /** The same date as `yyyy-mm-dd`, for `<time dateTime>`; `null` for an undated item. */
  publishedAt?: string | null
  abstract: string
  href: string
  /** The item's dedicated detail page, e.g. `/noticias/<slug>`. */
  detailHref?: string
}

/**
 * One news item on `/noticias`: a compact, text-only card in the same family as
 * `PublicationCard` (title, one meta line, a two-line summary, a link out).
 * If `detailHref` is provided, a primary button links to the news item's dedicated detail page
 * following the research areas pattern; "Abrir fuente" links to the external source.
 */
export function NewsCard({
  title,
  authors,
  source,
  date,
  publishedAt,
  abstract,
  href,
  detailHref,
}: NewsCardProps) {
  const hasActions = Boolean(detailHref || href)

  return (
    <article className={`surface-card ${styles.card}`}>
      <h3 className={styles.title}>{title}</h3>

      <p className={styles.meta}>
        {authors ? `${authors} · ` : null}
        {source} · {publishedAt ? <time dateTime={publishedAt}>{date}</time> : date}
      </p>

      {abstract ? <p className={styles.abstract}>{abstract}</p> : null}

      {hasActions ? (
        <div className={styles.footer}>
          {detailHref ? (
            <Button
              href={detailHref}
              icon={<ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />}
              variant="primary"
            >
              Conozca más sobre esta noticia <span className="sr-only">({title})</span>
            </Button>
          ) : null}

          {href ? (
            <Button
              href={href}
              icon={<ExternalLink aria-hidden="true" size={16} strokeWidth={1.8} />}
              rel="noopener noreferrer"
              target="_blank"
              variant={detailHref ? 'secondary' : 'primary'}
            >
              Abrir fuente{' '}
              {/* The space sits outside the hidden span: name computation trims an element's own
                  text, while browsers also add their own gap around it. Both read one space. */}
              <span className="sr-only">de «{title}» (se abre en una pestaña nueva)</span>
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
