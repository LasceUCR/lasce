import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'

import { PublicationsExplorer } from '@/app/components/public/publications/PublicationsExplorer'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { userHasPermission } from '@/app/lib/auth/authorization'
import { resolveLocale } from '@/app/lib/i18n/locale'
import { getPublications } from '@/app/lib/publications'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('publications.page')
  return { title: t('metaTitle'), description: t('metaDescription') }
}

export const dynamic = 'force-dynamic'

export default async function PublicacionesPage() {
  const [locale, t, common, canCreate, canEdit, canDelete] = await Promise.all([
    getLocale(),
    getTranslations('publications.page'),
    getTranslations('common'),
    userHasPermission('create_components'),
    userHasPermission('edit_components'),
    userHasPermission('delete_components'),
  ])

  // Titles and abstracts in the language chosen in the header (the `lasce_locale` cookie).
  // Both languages and the version to save against go to the browser only for an editor.
  const publications = await getPublications(resolveLocale(locale), {
    includeEditingData: canEdit,
  })

  return (
    <article className="topic-page">
      <TopicHero kicker={t('kicker')} lead={t('lead')} title={t('title')} />

      <PublicationsExplorer
        canCreate={canCreate}
        canDelete={canDelete}
        canEdit={canEdit}
        publications={publications}
      />

      <div className="topic-page-footer page-width">
        <TopicBackLink href="/" label={common('backToHome')} />
      </div>
    </article>
  )
}
