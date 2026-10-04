import { Activity, Layers, Magnet, Sun, type LucideIcon } from 'lucide-react'

import { CardGrid } from '@/app/components/public/topic/CardGrid'
import { ConceptFlow } from '@/app/components/public/topic/ConceptFlow'
import { InfoCard } from '@/app/components/public/topic/InfoCard'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { TopicSection } from '@/app/components/public/topic/TopicSection'
import type { SolarAstrophysicsContent, SolarOverviewItemId } from '@/app/lib/solar-astrophysics'

const overviewIcons: Record<SolarOverviewItemId, LucideIcon> = {
  activity: Sun,
  magneticField: Magnet,
  sunEarth: Layers,
  analysis: Activity,
}

export interface SolarAstrophysicsPageProps {
  /** Every string the page shows, already in the visitor's language. */
  content: SolarAstrophysicsContent
}

export function SolarAstrophysicsPage({ content }: SolarAstrophysicsPageProps) {
  const { hero, overview, lasce, backLink } = content

  return (
    <article className="topic-page">
      <TopicHero kicker={hero.kicker} lead={hero.introduction} title={hero.title} />

      <TopicSection
        index="1"
        intro={overview.intro}
        title={overview.title}
        titleId="solar-overview-title"
      >
        <CardGrid equalHeight>
          {overview.items.map((item) => {
            const Icon = overviewIcons[item.id]

            return (
              <InfoCard
                description={item.description}
                icon={<Icon size={22} strokeWidth={1.8} />}
                key={item.id}
                title={item.title}
              />
            )
          })}
        </CardGrid>
        <ConceptFlow
          caption={overview.flow.caption}
          steps={overview.flow.steps}
          title={overview.flow.title}
        />
      </TopicSection>

      <TopicSection
        featured
        className="topic-section-end"
        title={lasce.title}
        titleId="solar-lasce-title"
      >
        {lasce.paragraphs.map((paragraph) => (
          <p className="topic-intro" key={paragraph}>
            {paragraph}
          </p>
        ))}
      </TopicSection>

      <div className="topic-page-footer page-width">
        <TopicBackLink href={backLink.href} label={backLink.label} />
      </div>
    </article>
  )
}
