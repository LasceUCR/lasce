import { Globe, MapPin } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { Locale } from '@/app/lib/i18n/config'
import { contentLangAttribute } from '@/app/lib/i18n/content/resolve'
import type { CollaborationScope } from '@/app/lib/research-collaborations'

export interface CollaborationCardProps {
  name: string
  acronym?: string
  country: string
  countryLocale?: Locale | null
  scope: CollaborationScope
}

export function CollaborationCard({
  name,
  acronym,
  country,
  countryLocale,
  scope,
}: CollaborationCardProps) {
  const t = useTranslations('collaborations.card')
  const isNational = scope === 'national'

  return (
    <article className="surface-card collaboration-card">
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

      <h3 className="collaboration-name">{name}</h3>

      {acronym ? (
        <p className="collaboration-acronym">
          <strong>{t('acronym')}</strong> {acronym}
        </p>
      ) : null}
    </article>
  )
}
