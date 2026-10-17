import { ExternalLink } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/app/components/public/Button'
import { Notice } from '@/app/components/public/Notice'
import { TruncatedText } from '@/app/components/public/TruncatedText'

import styles from './NewsCard.module.css'

export interface NewsCardProps {
  title: string
  authors: string
  source: string
  /** The date as displayed in the site's language, e.g. "24 de mayo de 2026"; `null` if undated. */
  date: string | null
  /** The same date as `yyyy-mm-dd`, for `<time dateTime>`; `null` for an undated item. */
  publishedAt?: string | null
  abstract: string
  href: string
  /**
   * The language `title` and `abstract` are written in, set as their `lang`. `''` means unknown
   * (an item saved before languages existed); leave it out to inherit the page's language.
   */
  contentLang?: string
  /** Shown to editors: the item has no English version yet. */
  translationMissing?: boolean
}

/**
 * One news item on `/noticias`: a compact, text-only card in the same family as
 * `PublicationCard` (title, one meta line, a summary clamped to two lines with `TruncatedText`
 * ("Leer más" / "Leer menos"), a link out). The external article is the item's detail view, so
 * "Abrir fuente" opens it in a new tab; its accessible name adds the title, since every card
 * carries the same visible label. The card's own labels follow the site's language; its content
 * arrives in props, already in that language when it has one.
 */
export function NewsCard({
  title,
  authors,
  source,
  date,
  publishedAt,
  abstract,
  href,
  contentLang,
  translationMissing = false,
}: NewsCardProps) {
  const t = useTranslations('news.card')
  const shownDate = date ?? t('undated')

  return (
    <article className={`surface-card ${styles.card}`}>
      <h3 className={styles.title} lang={contentLang}>
        {title}
      </h3>

      <p className={styles.meta}>
        {authors ? `${authors} · ` : null}
        {source} · {publishedAt ? <time dateTime={publishedAt}>{shownDate}</time> : shownDate}
      </p>

      {abstract ? (
        <TruncatedText className={styles.abstract} lang={contentLang} lines={2}>
          {abstract}
        </TruncatedText>
      ) : null}

      {translationMissing ? <Notice tone="warning">{t('translationMissing')}</Notice> : null}

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
            <span className="sr-only">{t('openSourceContext', { title })}</span>
          </Button>
        </div>
      ) : null}
    </article>
  )
}
