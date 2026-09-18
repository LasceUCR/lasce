import type { Metadata } from 'next'

import { PublicationsExplorer } from '@/app/components/public/publications/PublicationsExplorer'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import {
  getPublications,
  publicacionesBackLink,
  publicacionesHero,
  publicacionesMeta,
} from '@/app/lib/publications'

export const metadata: Metadata = {
  title: publicacionesMeta.title,
  description: publicacionesMeta.description,
}

export const dynamic = 'force-dynamic'

export default async function PublicacionesPage() {
  const publications = await getPublications()

  return (
    <article className="topic-page">
      <TopicHero
        kicker={publicacionesHero.kicker}
        lead={publicacionesHero.lead}
        title={publicacionesHero.title}
      />

      <PublicationsExplorer publications={publications} />

      <div className="topic-page-footer page-width">
        <TopicBackLink href={publicacionesBackLink.href} label={publicacionesBackLink.label} />
      </div>
    </article>
  )
}
