import type { Metadata } from 'next'
import { ArrowDown } from 'lucide-react'

import { ScientificDataExplorer } from '@/app/components/public/scientific-data/ScientificDataExplorer'
import { SolarTodayLive } from '@/app/components/public/scientific-data/SolarTodayLive'
import { goesInstruments, scientificSources } from '@/app/lib/scientific-data'
import { getSuviAvailability } from '@/app/lib/scientific-data-availability'
import { getInitialScientificQuery } from '@/app/lib/scientific-data-navigation'

const description = 'Explore imágenes del Sol y consulte la información científica disponible.'

export const metadata: Metadata = {
  title: 'Datos científicos | LASCE',
  description,
  alternates: { canonical: '/datos' },
}

export const dynamic = 'force-dynamic'

interface ScientificDataRouteProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ScientificDataRoute({ searchParams }: ScientificDataRouteProps) {
  const today = new Date()
  const maxDate = today.toISOString().slice(0, 10)
  const initialQuery = getInitialScientificQuery(await searchParams, maxDate)

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
        key={`${initialQuery.source}:${initialQuery.product}`}
        suviAvailability={getSuviAvailability(today)}
        initialQuery={initialQuery}
        sources={scientificSources}
      />
    </article>
  )
}
