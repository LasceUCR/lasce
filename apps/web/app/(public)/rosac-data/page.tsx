import { ContentFlag } from '@/app/components/public/topic/ContentFlag'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { RosacDataView } from '@/app/components/public/rosac-data/RosacDataView'
import { InputTimeField } from '@/app/components/public/rosac-data/InputTimeField'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { Button } from '@/app/components/public/Button'

import { rosacDataHero, rosacMockData, rosacDataBackLink } from '@/app/lib/rosac-data'

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

      <section className="rosac-data-section page-width">
        <InputTimeField className="" type="date" disabled={false} label="Fecha" id="date" />
        <InputTimeField
          className=""
          type="time"
          disabled={false}
          label="Hora inicial"
          id="startTime"
        />
        <InputTimeField className="" type="time" disabled={false} label="Hora final" id="endTime" />
        <Button variant="secondary">Consultar</Button>
      </section>

      <section className="rosac-data-section page-width">
        <RosacDataView
          labelX={rosacMockData.labelX}
          labelY={rosacMockData.labelY}
          times={rosacMockData.times}
          frequencies={rosacMockData.frequencies}
          intensity={rosacMockData.intensity}
        />
      </section>

      <div className="topic-page-footer page-width">
        <TopicBackLink href={rosacDataBackLink.href} label={rosacDataBackLink.label} />
      </div>
    </article>
  )
}
