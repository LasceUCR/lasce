import type { Metadata } from 'next'

import { ContentFlag } from '@/app/components/public/topic/ContentFlag'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { RosacDataView } from '@/app/components/public/rosac-data/RosacDataView'
import {
  investigacionBackLink,
  investigacionHero,
  investigacionMeta,
  publications,
} from '@/app/lib/publications'

import {
  rosacDataHero,
  rosacTestData
} from '@/app/lib/rosac-data'



export default function InvestigacionPage() {
  return (
    <article className="topic-page">
      <TopicHero
        kicker={rosacDataHero.kicker}
        lead={rosacDataHero.lead}
        title={rosacDataHero.title}
      />

      <ContentFlag
        label="Información provisional"
        message="El contenido de esta página es preliminar y está sujeto a revisión."
      />

      <div className="topic-page-footer page-width">
        <RosacDataView label={rosacTestData.label} times={rosacTestData.times} frequencies={rosacTestData.frequencies} intensity={rosacTestData.intensity} />
      </div>
    </article>
  )
}
