import type { Metadata } from 'next'

import { ResearchAreasSection } from '@/app/components/public/research/ResearchAreasSection'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { ContentFlag } from '@/app/components/public/topic/ContentFlag'
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
        subtitle="Conoce los principales temas y líneas de trabajo del laboratorio."
        title="Líneas de investigación"
      />

      <div className="topic-page-footer page-width">
        <TopicBackLink href={investigacionBackLink.href} label={investigacionBackLink.label} />
      </div>
    </article>
  )
}
