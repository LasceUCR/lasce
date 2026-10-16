import { ExternalLink } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/app/components/public/Button'
import { TruncatedText } from '@/app/components/public/TruncatedText'

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
 * `PublicationCard` (title, one meta line, a summary clamped with TruncatedText, a link out).
 * Its summary is clamped to two lines with `TruncatedText` ("Leer más" / "Leer menos"), exactly
 * like `PublicationCard`. "Abrir fuente" links to the external source.
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
  const t = useTranslations('news.card')

  return (
    <article className={`surface-card ${styles.card}`}>
      <h3 className={styles.title}>{title}</h3>

      <p className={styles.meta}>
        {authors ? `${authors} · ` : null}
        {source} · {publishedAt ? <time dateTime={publishedAt}>{date}</time> : date}
      </p>

      {abstract ? (
        <TruncatedText className={styles.abstract} lines={2}>
          {abstract}
        </TruncatedText>
      ) : null}

      {href ? (
        <div className={styles.footer}>
          <Button
            href={href}
            icon={<ExternalLink aria-hidden="true" size={16} strokeWidth={1.8} />}
            rel="noopener noreferrer"
            target="_blank"
            variant="primary"
          >
            {t('openSource')}{' '}
            {/* The space sits outside the hidden span: name computation trims an element's own
                text, while browsers also add their own gap around it. Both read one space. */}
            <span className="sr-only">{t('openSourceAria', { title })}</span>
          </Button>
        </div>
      ) : null}
    </article>
  )
}
