import type { Metadata } from 'next'

import { PublicationsExplorer } from '@/app/components/public/publications/PublicationsExplorer'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { investigacionBackLink, investigacionHero, investigacionMeta, publications } from '@/app/lib/publications'

export const metadata: Metadata = {
  title: investigacionMeta.title,
  description: investigacionMeta.description,
}

export default function InvestigacionPage() {
  return (
    <article className="topic-page">
      <TopicHero kicker={investigacionHero.kicker} lead={investigacionHero.lead} title={investigacionHero.title} />

      <PublicationsExplorer publications={publications} />

      <div className="topic-page-footer page-width">
        <TopicBackLink href={investigacionBackLink.href} label={investigacionBackLink.label} />
      </div>
    </article>
  )
}
