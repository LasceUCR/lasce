import type { Metadata } from 'next'

import { ContentFlag } from '@/app/components/public/topic/ContentFlag'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { RosacDataView } from '@/app/components/public/rosac-data/RosacDataView'

import {
  rosacDataHero,
  rosacMockData
} from '@/app/lib/rosac-data'



export default function RosacDataPage() {
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
        <RosacDataView label={rosacMockData.label} times={rosacMockData.times} frequencies={rosacMockData.frequencies} intensity={rosacMockData.intensity} />
      </div>
    </article>
  )
}
