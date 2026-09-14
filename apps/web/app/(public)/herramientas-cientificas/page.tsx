import type { Metadata } from 'next'

import { ScientificToolsList } from '@/app/components/public/scientific-tools/ScientificToolsList'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { scientificTools, scientificToolsIntro } from '@/app/lib/scientific-tools'

export const metadata: Metadata = {
  title: 'Herramientas científicas | LASCE',
  description: scientificToolsIntro,
  alternates: { canonical: '/herramientas-cientificas' },
}

export default function ScientificToolsRoute() {
  return (
    <article className="topic-page">
      <TopicHero
        kicker="Recursos de LASCE"
        title="Herramientas científicas"
        lead={scientificToolsIntro}
      />
      <div className="page-width topic-page-footer">
        <ScientificToolsList tools={scientificTools} />
      </div>
    </article>
  )
}
