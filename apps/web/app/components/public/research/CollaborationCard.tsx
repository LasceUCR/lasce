import styles from './CollaborationCard.module.css'
import { Globe, MapPin } from 'lucide-react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'

import type { Locale } from '@/app/lib/i18n/config'
import { contentLangAttribute } from '@/app/lib/i18n/content/resolve'
import type { CollaborationScope } from '@/app/lib/research-collaborations'

export interface CollaborationCardProps {
  name: string
  acronym?: string
  websiteUrl?: string
  logoPath?: string
  country: string
  countryLocale?: Locale | null
  scope: CollaborationScope
}

export function CollaborationCard({
  name,
  acronym,
  websiteUrl,
  logoPath,
  country,
  countryLocale,
  scope,
}: CollaborationCardProps) {
  const t = useTranslations('collaborations.card')
  const isNational = scope === 'national'
  const hasWebsite = isHttpWebsite(websiteUrl)
  const websiteProps = {
    href: websiteUrl,
    rel: 'noopener noreferrer',
    target: '_blank',
  }
  const logo = logoPath ? (
    <Image
      alt={t('logoAlt', { name })}
      className={styles.logo}
      fill
      sizes="(max-width: 360px) 70vw, 240px"
      src={logoPath}
    />
  ) : null

  return (
    <article className={`surface-card collaboration-card ${styles.card}`}>
      <div className="collaboration-card-header">
        <span className={`collaboration-badge collaboration-badge-${scope}`} data-scope={scope}>
          {t(scope)}
        </span>
        <span className="collaboration-country">
          {isNational ? (
            <MapPin aria-hidden="true" size={14} />
          ) : (
            <Globe aria-hidden="true" size={14} />
          )}
          <span lang={contentLangAttribute(countryLocale)}>{country}</span>
        </span>
      </div>

      {logo ? (
        hasWebsite ? (
          <a
            aria-label={t('websiteLabel', { name })}
            className={`${styles.logoContainer} ${styles.logoLink}`}
            {...websiteProps}
          >
            {logo}
          </a>
        ) : (
          <div className={styles.logoContainer}>{logo}</div>
        )
      ) : null}

      <h3 className="collaboration-name">
        {!logo && hasWebsite ? (
          <a className={styles.nameLink} title={t('websiteLabel', { name })} {...websiteProps}>
            {name}
          </a>
        ) : (
          name
        )}
      </h3>

      {acronym ? (
        <p className="collaboration-acronym">
          <strong>{t('acronym')}</strong> {acronym}
        </p>
      ) : null}
    </article>
  )
}

/** Also guard legacy records and callers that have not gone through the editor's validation. */
function isHttpWebsite(value?: string): boolean {
  if (!value) return false
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
  } catch {
    return false
  }
}
