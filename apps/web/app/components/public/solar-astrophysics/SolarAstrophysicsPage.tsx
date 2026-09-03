import { Activity, Layers, Magnet, Sun, type LucideIcon } from 'lucide-react'

import { CardGrid } from '@/app/components/public/topic/CardGrid'
import { ConceptFlow } from '@/app/components/public/topic/ConceptFlow'
import { InfoCard } from '@/app/components/public/topic/InfoCard'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { TopicSection } from '@/app/components/public/topic/TopicSection'
import {
  solarAstrophysicsBackLink,
  solarAstrophysicsHero,
  solarAstrophysicsLasce,
  solarAstrophysicsOverview,
} from '@/app/lib/solar-astrophysics'

const overviewIcons: LucideIcon[] = [Sun, Magnet, Layers, Activity]

export function SolarAstrophysicsPage() {
  return (
    <article className="topic-page solar-topic-page">
      <TopicHero
        image={solarAstrophysicsHero.image}
        kicker={solarAstrophysicsHero.kicker}
        lead={solarAstrophysicsHero.introduction}
        title={solarAstrophysicsHero.title}
      />

      <TopicSection
        index="1"
        intro={solarAstrophysicsOverview.intro}
        title={solarAstrophysicsOverview.title}
        titleId="solar-overview-title"
      >
        <CardGrid>
          {solarAstrophysicsOverview.items.map((item, index) => {
            const Icon = overviewIcons[index] ?? Sun

            return (
              <InfoCard
                description={item.description}
                icon={<Icon size={22} strokeWidth={1.8} />}
                key={item.title}
                title={item.title}
              />
            )
          })}
        </CardGrid>
        <ConceptFlow
          caption={solarAstrophysicsOverview.flow.caption}
          steps={solarAstrophysicsOverview.flow.steps}
          title={solarAstrophysicsOverview.flow.title}
        />
      </TopicSection>

      <TopicSection
        className="topic-section-end"
        badge="Texto temporal"
        title={solarAstrophysicsLasce.title}
        titleId="solar-lasce-title"
      >
        <div className="solar-lasce-panel surface-card">
          <div className="solar-lasce-copy">
            {solarAstrophysicsLasce.paragraphs.map((paragraph) => (
              <p className="topic-intro" key={paragraph}>
                {paragraph}
              </p>
            ))}
          </div>
          <aside className="solar-content-note" aria-label="Nota de contenido">
            <strong>Contenido temporal</strong>
            <p>{solarAstrophysicsLasce.note}</p>
          </aside>
        </div>
        <TopicBackLink
          href={solarAstrophysicsBackLink.href}
          label={solarAstrophysicsBackLink.label}
        />
      </TopicSection>
    </article>
  )
}
