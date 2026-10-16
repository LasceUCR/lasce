import { useTranslations } from 'next-intl'

import type { ResearchArea } from '@/app/lib/research-area-schema'
import { contentLangAttribute } from '@/app/lib/i18n/content/resolve'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'

export interface ResearchAreaPageProps {
  area: ResearchArea
  backHref?: string
  /** The back link's label; "Volver a áreas de investigación" in the page's language by default. */
  backLabel?: string
}

export function ResearchAreaPage({
  area,
  backHref = '/investigacion',
  backLabel,
}: ResearchAreaPageProps) {
  const t = useTranslations('researchAreas.detail')

  return (
    <article className="topic-page">
      <TopicHero
        contentLang={contentLangAttribute(area.contentLocale)}
        kicker={t('kicker')}
        lead={area.description}
        title={area.title}
      />

      <div className="topic-page-footer page-width">
        <TopicBackLink href={backHref} label={backLabel ?? t('back')} />
      </div>
    </article>
  )
}
