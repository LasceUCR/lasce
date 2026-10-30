import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { Suspense } from 'react'

import { ResearchAreasSection } from '@/app/components/public/research/ResearchAreasSection'
import { ResearchAreasSkeleton } from '@/app/components/public/research/ResearchAreasSkeleton'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { userHasPermission } from '@/app/lib/auth/authorization'
import { resolveLocale } from '@/app/lib/i18n/locale'
import {
  isListingUrl,
  listingHref,
  PAGE_PARAM,
  parsePageParam,
  type SearchParamValue,
} from '@/app/lib/pagination'
import { getResearchAreasPage } from '@/app/lib/research-areas'

interface InvestigacionPageProps {
  searchParams: Promise<Record<string, SearchParamValue>>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('researchAreas.page')
  return { title: t('metaTitle'), description: t('metaDescription') }
}

/** Data and permissions suspend together, leaving the static hero and navigation usable. */
async function ResearchAreasContent({ searchParams }: InvestigacionPageProps) {
  const [params, locale, t, canCreate, canEdit, canDelete] = await Promise.all([
    searchParams,
    getLocale(),
    getTranslations('researchAreas.page'),
    userHasPermission('create_components'),
    userHasPermission('edit_components'),
    userHasPermission('delete_components'),
  ])
  const result = await getResearchAreasPage(resolveLocale(locale), {
    page: parsePageParam(params[PAGE_PARAM]),
    includeEditingData: canEdit,
  })

  if (!isListingUrl(params, result)) redirect(listingHref('/investigacion', result))

  return (
    <ResearchAreasSection
      canCreate={canCreate}
      canDelete={canDelete}
      canEdit={canEdit}
      areas={result.areas}
      page={result.page}
      totalItems={result.totalItems}
      totalPages={result.totalPages}
      id="research-areas"
      label={t('title')}
    />
  )
}

export default async function InvestigacionPage({ searchParams }: InvestigacionPageProps) {
  const [params, t, common] = await Promise.all([
    searchParams,
    getTranslations('researchAreas.page'),
    getTranslations('common'),
  ])

  return (
    <article className="topic-page">
      <TopicHero kicker={t('kicker')} lead={t('lead')} title={t('title')} />

      <Suspense key={JSON.stringify(params[PAGE_PARAM])} fallback={<ResearchAreasSkeleton />}>
        <ResearchAreasContent searchParams={searchParams} />
      </Suspense>

      <div className="topic-page-footer page-width">
        <TopicBackLink href="/" label={common('backToHome')} />
      </div>
    </article>
  )
}
