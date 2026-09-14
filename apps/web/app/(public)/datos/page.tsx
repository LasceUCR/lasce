import type { Metadata } from 'next'

import { ScientificDataExplorer } from '@/app/components/public/scientific-data/ScientificDataExplorer'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { scientificSources } from '@/app/lib/scientific-data'

const description =
  'Consulte y visualice observaciones de los satélites GOES y la integración prevista de ROSAC.'

export const metadata: Metadata = {
  title: 'Datos científicos | LASCE',
  description,
  alternates: { canonical: '/datos' },
}

export const dynamic = 'force-dynamic'

export default function ScientificDataRoute() {
  const today = new Date()
  const oldestGoesDate = new Date(today)
  oldestGoesDate.setUTCDate(today.getUTCDate() - 6)
  const maxDate = today.toISOString().slice(0, 10)
  const minDate = oldestGoesDate.toISOString().slice(0, 10)

  return (
    <article className="topic-page">
      <TopicHero
        kicker="Datos abiertos de LASCE"
        lead={description}
        title="Datos"
        variant="compact"
      />
      <ScientificDataExplorer
        goesDateRange={{ min: minDate, max: maxDate }}
        initialQuery={{
          source: 'GOES',
          product: 'SFXR',
          parameter: '0.1-0.8nm',
          date: maxDate,
          startTime: '00:00',
          endTime: '23:59',
        }}
        sources={scientificSources}
      />
    </article>
  )
}
