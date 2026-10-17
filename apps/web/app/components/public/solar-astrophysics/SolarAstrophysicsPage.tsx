import { Activity, Layers, Magnet, Sun, type LucideIcon } from 'lucide-react'

import { CardGrid } from '@/app/components/public/topic/CardGrid'
import { ConceptFlow } from '@/app/components/public/topic/ConceptFlow'
import { InfoCard } from '@/app/components/public/topic/InfoCard'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { TopicSection } from '@/app/components/public/topic/TopicSection'
import type { SolarAstrophysicsContent, SolarOverviewItemId } from '@/app/lib/solar-astrophysics'
import type { SolarPhysicsSection } from '@/app/lib/solar-physics-section-schema'

import { EditableLasceSection } from './EditableLasceSection'
import { LasceSectionView } from './LasceSectionView'

const overviewIcons: Record<SolarOverviewItemId, LucideIcon> = {
  activity: Sun,
  magneticField: Magnet,
  sunEarth: Layers,
  analysis: Activity,
}

export interface SolarAstrophysicsPageProps {
  /** Every string the page shows, already in the visitor's language. */
  content: SolarAstrophysicsContent
  /**
   * The editable "El trabajo de LASCE en Física Solar" section, from the database. Left out
   * (or `null`) when the section does not exist, in which case the page omits it.
   */
  lasceSection?: SolarPhysicsSection | null
  /** True for someone who may edit the section in "Modo edición". */
  canEditLasce?: boolean
}

export function SolarAstrophysicsPage({
  content,
  lasceSection = null,
  canEditLasce = false,
}: SolarAstrophysicsPageProps) {
  const { hero, overview, backLink } = content

  // Visitors get the plain section; the client-side editor is loaded only for someone who can
  // edit it and was sent the editing data.
  const canEdit = canEditLasce && lasceSection?.editing !== undefined
  const lasce = lasceSection ? (
    canEdit ? (
      <EditableLasceSection canEdit section={lasceSection} />
    ) : (
      <LasceSectionView section={lasceSection} />
    )
  ) : null

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

      {lasce}

      <div className="topic-page-footer page-width">
        <TopicBackLink href={backLink.href} label={backLink.label} />
      </div>
    </article>
  )
}
