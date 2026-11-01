import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'

import { PublicationsExplorer } from '@/app/components/public/publications/PublicationsExplorer'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { userHasPermission } from '@/app/lib/auth/authorization'
import { resolveLocale } from '@/app/lib/i18n/locale'
import { PAGE_PARAM, parsePageParam, type SearchParamValue } from '@/app/lib/pagination'
import {
  GROUP_PARAM,
  isPublicationListingUrl,
  parseGroupParam,
  publicationListingHref,
} from '@/app/lib/publication-listing'
import { getPublicationsPage } from '@/app/lib/publications'
import { parseSearchParam, SEARCH_PARAM } from '@/app/lib/search-query'

const PUBLICATIONS_PATH = '/publicaciones'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('publications.page')
  return { title: t('metaTitle'), description: t('metaDescription') }
}

export const dynamic = 'force-dynamic'

interface PublicationsPageProps {
  searchParams: Promise<Record<string, SearchParamValue>>
}

/**
 * `?q=` searches the publications, `?group=` limits them to one research group and `?page=` picks
 * a page of the results (see `getPublicationsPage`). All three are validated here, on the server;
 * a URL that asks for something else than what is shown (a malformed page, a page past the end,
 * an unknown group, untrimmed text) is redirected to the one that says what is shown, so the page
 * and the URL always agree, after a reload, a language change or an edit too.
 */
export default async function PublicacionesPage({ searchParams }: PublicationsPageProps) {
  const params = await searchParams
  const [locale, t, common, canCreate, canEdit, canDelete] = await Promise.all([
    getLocale(),
    getTranslations('publications.page'),
    getTranslations('common'),
    userHasPermission('create_components'),
    userHasPermission('edit_components'),
    userHasPermission('delete_components'),
  ])

  // Titles and abstracts in the language chosen in the header (the `lasce_locale` cookie).
  // Both languages and the version to save against go to the browser only for an editor, and
  // only for the publications on this page.
  const publications = await getPublicationsPage(resolveLocale(locale), {
    query: parseSearchParam(params[SEARCH_PARAM]),
    page: parsePageParam(params[PAGE_PARAM]),
    group: parseGroupParam(params[GROUP_PARAM]),
    includeEditingData: canEdit,
  })

  if (!isPublicationListingUrl(params, publications)) {
    redirect(publicationListingHref(PUBLICATIONS_PATH, publications))
  }

  return (
    <article className="topic-page">
      <TopicHero kicker={t('kicker')} lead={t('lead')} title={t('title')} />

      <PublicationsExplorer
        canCreate={canCreate}
        canDelete={canDelete}
        canEdit={canEdit}
        group={publications.group}
        page={publications.page}
        publications={publications.publications}
        query={publications.query}
        totalItems={publications.totalItems}
        totalPages={publications.totalPages}
      />

      <div className="topic-page-footer page-width">
        <TopicBackLink href="/" label={common('backToHome')} />
      </div>
    </article>
  )
}
