import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'

import { ResearchAreasSection } from '@/app/components/public/research/ResearchAreasSection'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { userHasPermission } from '@/app/lib/auth/authorization'
import { resolveLocale } from '@/app/lib/i18n/locale'
import { getResearchAreas } from '@/app/lib/research-areas'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('researchAreas.page')
  return { title: t('metaTitle'), description: t('metaDescription') }
}

export default async function InvestigacionPage() {
  const [locale, t, common, canCreate, canEdit, canDelete] = await Promise.all([
    getLocale(),
    getTranslations('researchAreas.page'),
    getTranslations('common'),
    userHasPermission('create_components'),
    userHasPermission('edit_components'),
    userHasPermission('delete_components'),
  ])

  // Titles and descriptions in the language chosen in the header (the `lasce_locale` cookie).
  const areas = await getResearchAreas(resolveLocale(locale))

  return (
    <article className="topic-page">
      <TopicHero kicker={t('kicker')} lead={t('lead')} title={t('title')} />

      <ResearchAreasSection
        canCreate={canCreate}
        canDelete={canDelete}
        canEdit={canEdit}
        areas={areas}
        id="research-areas"
        label={t('title')}
      />

      <div className="topic-page-footer page-width">
        <TopicBackLink href="/" label={common('backToHome')} />
      </div>
    </article>
  )
}
