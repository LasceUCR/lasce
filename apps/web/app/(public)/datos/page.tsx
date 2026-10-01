import type { Metadata } from 'next'
import { ArrowDown } from 'lucide-react'

import { ScientificDataExplorer } from '@/app/components/public/scientific-data/ScientificDataExplorer'
import { SolarTodayLive } from '@/app/components/public/scientific-data/SolarTodayLive'
import { goesInstruments, scientificSources } from '@/app/lib/scientific-data'
import { getGoesAvailability } from '@/app/lib/scientific-data-availability'

const description = 'Explore imágenes del Sol y consulte la información científica disponible.'

export const metadata: Metadata = {
  title: 'Datos científicos | LASCE',
  description,
  alternates: { canonical: '/datos' },
}

export const dynamic = 'force-dynamic'

export default function ScientificDataRoute() {
  const today = new Date()
  const maxDate = today.toISOString().slice(0, 10)

  return (
    <article className="topic-page">
      <header className="data-page-header">
        <p className="topic-kicker">Portal público LASCE</p>
        <div className="data-page-title">
          <h1>Datos</h1>
          <a className="data-query-shortcut" href="#scientific-query-title">
            Ir a la consulta <ArrowDown aria-hidden="true" size={16} />
          </a>
        </div>
        <p className="topic-lead">{description}</p>
      </header>
      <SolarTodayLive
        instrument={goesInstruments.find((instrument) => instrument.code === 'SUVI')!}
        initialNow={today.toISOString()}
      />
      <ScientificDataExplorer
        goesAvailability={getGoesAvailability(today)}
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
