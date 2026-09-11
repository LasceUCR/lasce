import type { Metadata } from 'next'
import Image from 'next/image'
import { ExternalLink } from 'lucide-react'

import { Button } from '@/app/components/public/Button'
import { CardGrid } from '@/app/components/public/topic/CardGrid'
import { InfoCard } from '@/app/components/public/topic/InfoCard'
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
        <CardGrid columns={1}>
          {scientificTools.map(({ title, description, href }) => (
            <InfoCard
              key={title}
              title={title}
              description={description}
              icon={
                <Image
                  src="/images/tools/scientific-pattern.webp"
                  alt=""
                  width={160}
                  height={96}
                />
              }
              headingLevel={2}
              layout="horizontal"
              action={
                <Button
                  href={href}
                  external
                  icon={<ExternalLink aria-hidden="true" size={18} strokeWidth={1.8} />}
                >
                  Acceder a {title}
                </Button>
              }
            />
          ))}
        </CardGrid>
        <p className="topic-intro">
          Los enlaces se abren en una nueva pestaña y te llevan a sitios externos.
        </p>
      </div>
    </article>
  )
}
