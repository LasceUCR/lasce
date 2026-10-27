import type { Metadata } from 'next'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getLocale, getMessages, getTranslations } from 'next-intl/server'

import { AcademicActivitiesSection } from '@/app/components/public/news/AcademicActivitiesSection'
import { NewsExplorer } from '@/app/components/public/news/NewsExplorer'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { getAcademicActivities } from '@/app/lib/academic-activities'
import { userHasPermission } from '@/app/lib/auth/authorization'
import { resolveLocale } from '@/app/lib/i18n/locale'
import { getNewsPage } from '@/app/lib/news'
import {
  isListingUrl,
  listingHref,
  PAGE_PARAM,
  parsePageParam,
  type SearchParamValue,
} from '@/app/lib/pagination'
import { parseSearchParam, SEARCH_PARAM } from '@/app/lib/search-query'

const NEWS_PATH = '/noticias'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('news.page')

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  }
}

export const dynamic = 'force-dynamic'

interface NewsPageProps {
  searchParams: Promise<Record<string, SearchParamValue>>
}

/**
 * `?q=` searches the news and `?page=` picks a page of the results (see `getNewsPage`). Both are
 * validated here, on the server; a URL that asks for something else than what is shown (a
 * malformed page, a page past the end, untrimmed text) is redirected to the one that says what is
 * shown, so the page and the URL always agree, after a reload, a language change or an edit too.
 */
export default async function NewsPage({ searchParams }: NewsPageProps) {
  const params = await searchParams
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
  const news = await getNewsPage(resolveLocale(locale), {
    query: parseSearchParam(params[SEARCH_PARAM]),
    page: parsePageParam(params[PAGE_PARAM]),
    includeEditingData: canEdit,
  })

  if (!isListingUrl(params, news)) {
    redirect(listingHref(NEWS_PATH, news))
  }

  return (
    <article className="topic-page">
      <TopicHero kicker={t('kicker')} lead={t('lead')} title={t('title')} />

      <Suspense fallback={<AcademicActivitiesSection id="academic-activities" loading={true} />}>
        <AcademicActivitiesSection
          activities={getAcademicActivities(messages.academicActivities.items)}
          id="academic-activities"
        />
      </Suspense>

      <NewsExplorer
        canCreate={canCreate}
        canDelete={canDelete}
        canEdit={canEdit}
        news={news.articles}
        page={news.page}
        query={news.query}
        totalItems={news.totalItems}
        totalPages={news.totalPages}
      />

      <div className="topic-page-footer page-width">
        <TopicBackLink href="/" label={common('backToHome')} />
      </div>
    </article>
  )
}
