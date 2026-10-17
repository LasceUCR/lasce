import type { Metadata } from 'next'
import { getLocale, getMessages, getTranslations } from 'next-intl/server'

import { AcademicActivitiesSection } from '@/app/components/public/news/AcademicActivitiesSection'
import { NewsExplorer } from '@/app/components/public/news/NewsExplorer'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { getAcademicActivities } from '@/app/lib/academic-activities'
import { userHasPermission } from '@/app/lib/auth/authorization'
import { resolveLocale } from '@/app/lib/i18n/locale'
import { getNews } from '@/app/lib/news'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('news.page')

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  }
}

export const dynamic = 'force-dynamic'

export default async function NewsPage() {
  const [locale, messages, t, common, canCreate, canEdit, canDelete] = await Promise.all([
    getLocale(),
    getMessages(),
    getTranslations('news.page'),
    getTranslations('common'),
    userHasPermission('create_components'),
    userHasPermission('edit_components'),
    userHasPermission('delete_components'),
  ])

  // Every language goes to the browser only for someone who can edit.
  const news = await getNews(resolveLocale(locale), { includeEditingData: canEdit })

  return (
    <article className="topic-page">
      <TopicHero kicker={t('kicker')} lead={t('lead')} title={t('title')} />

      <AcademicActivitiesSection
        activities={getAcademicActivities(messages.academicActivities.items)}
        id="academic-activities"
      />

      <NewsExplorer canCreate={canCreate} canDelete={canDelete} canEdit={canEdit} news={news} />

      <div className="topic-page-footer page-width">
        <TopicBackLink href="/" label={common('backToHome')} />
      </div>
    </article>
  )
}
