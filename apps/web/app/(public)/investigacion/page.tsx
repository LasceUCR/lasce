import type { Metadata } from 'next'

import { ResearchAreasSection } from '@/app/components/public/research/ResearchAreasSection'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import {
  investigacionBackLink,
  investigacionHero,
  investigacionMeta,
  researchAreas,
} from '@/app/lib/research-areas'

export const metadata: Metadata = {
  title: investigacionMeta.title,
  description: investigacionMeta.description,
}

export default function InvestigacionPage() {
  return (
    <article className="topic-page">
      <TopicHero
        kicker={investigacionHero.kicker}
        lead={investigacionHero.lead}
        title={investigacionHero.title}
      />

      <ResearchAreasSection
        areas={researchAreas}
        id="research-areas"
      />

      <div className="topic-page-footer page-width">
        <TopicBackLink href={investigacionBackLink.href} label={investigacionBackLink.label} />
      </div>
    </article>
  )
}
