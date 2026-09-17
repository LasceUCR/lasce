import type { Metadata } from 'next'

import { NewsExplorer } from '@/app/components/public/news/NewsExplorer'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { userHasPermission } from '@/app/lib/auth/authorization'
import { getNews, noticiasBackLink, noticiasHero, noticiasMeta } from '@/app/lib/news'

export const metadata: Metadata = {
  title: noticiasMeta.title,
  description: noticiasMeta.description,
}

export const dynamic = 'force-dynamic'

export default async function NewsPage() {
  const [news, canCreate, canEdit, canDelete] = await Promise.all([
    getNews(),
    userHasPermission('create_components'),
    userHasPermission('edit_components'),
    userHasPermission('delete_components'),
  ])

  return (
    <article className="topic-page">
      <TopicHero kicker={noticiasHero.kicker} lead={noticiasHero.lead} title={noticiasHero.title} />

      <NewsExplorer canCreate={canCreate} canDelete={canDelete} canEdit={canEdit} news={news} />

      <div className="topic-page-footer page-width">
        <TopicBackLink href={noticiasBackLink.href} label={noticiasBackLink.label} />
      </div>
    </article>
  )
}
