import { ExternalLink } from 'lucide-react'

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
}

/**
 * One news item on `/noticias`: a compact, text-only card in the same family as
 * `PublicationCard` (title, one meta line, a two-line summary, a link out). The external article
 * is the item's detail view, so "Abrir fuente" opens it in a new tab; its accessible name adds
 * the title, since every card carries the same visible label.
 */
export function NewsCard({
  title,
  authors,
  source,
  date,
  publishedAt,
  abstract,
  href,
}: NewsCardProps) {
  return (
    <article className={`surface-card ${styles.card}`}>
      <h3 className={styles.title}>{title}</h3>

      <p className={styles.meta}>
        {authors ? `${authors} · ` : null}
        {source} · {publishedAt ? <time dateTime={publishedAt}>{date}</time> : date}
      </p>

      {abstract ? <p className={styles.abstract}>{abstract}</p> : null}

      {href ? (
        <div className={styles.footer}>
          <Button
            href={href}
            icon={<ExternalLink aria-hidden="true" size={16} strokeWidth={1.8} />}
            rel="noopener noreferrer"
            target="_blank"
            variant="primary"
          >
            Abrir fuente{' '}
            {/* The space sits outside the hidden span: name computation trims an element's own
                text, while browsers also add their own gap around it. Both read one space. */}
            <span className="sr-only">de «{title}» (se abre en una pestaña nueva)</span>
          </Button>
        </div>
      ) : null}
    </article>
  )
}
