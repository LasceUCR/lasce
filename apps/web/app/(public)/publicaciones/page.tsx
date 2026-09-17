import type { Metadata } from 'next'

import { PublicationsExplorer } from '@/app/components/public/publications/PublicationsExplorer'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { userHasPermission } from '@/app/lib/auth/authorization'
import {
  getPublications,
  publicacionesBackLink,
  publicacionesHero,
  publicacionesMeta,
  type Publication,
} from '@/app/lib/publications'

export const metadata: Metadata = {
  title: publicacionesMeta.title,
  description: publicacionesMeta.description,
}

export const dynamic = 'force-dynamic'

export default async function PublicacionesPage() {
  const [publications, canCreate, canEdit, canDelete] = await Promise.all([
    getPublications(),
    userHasPermission('create_components'),
    userHasPermission('edit_components'),
    userHasPermission('delete_components'),
  ])

  return (
    <article className="topic-page">
      <TopicHero
        kicker={publicacionesHero.kicker}
        lead={publicacionesHero.lead}
        title={publicacionesHero.title}
      />

      <PublicationsExplorer
        canCreate={canCreate}
        canDelete={canDelete}
        canEdit={canEdit}
        publications={publications}
      />

      <div className="topic-page-footer page-width">
        <TopicBackLink href={publicacionesBackLink.href} label={publicacionesBackLink.label} />
      </div>
    </article>
  )
}
