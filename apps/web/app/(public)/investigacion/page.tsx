import type { Metadata } from 'next'

import { ContentFlag } from '@/app/components/public/topic/ContentFlag'
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

      <ContentFlag
        label="Información provisional"
        message="El contenido de esta página es preliminar y está sujeto a revisión."
      />

      <ResearchAreasSection
        areas={researchAreas}
        id="research-areas"
        subtitle="Principales temas de investigación desarrollados por el LASCE."
        title="Áreas de investigación"
      />

      <div className="topic-page-footer page-width">
        <TopicBackLink href={investigacionBackLink.href} label={investigacionBackLink.label} />
      </div>
    </article>
  )
}
