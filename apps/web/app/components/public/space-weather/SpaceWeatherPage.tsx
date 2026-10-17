import { Magnet, Orbit, Radio, Sparkles, Sun, Wind, Zap, type LucideIcon } from 'lucide-react'

import { CardGrid } from '@/app/components/public/topic/CardGrid'
import { ConceptFlow } from '@/app/components/public/topic/ConceptFlow'
import { InfoCard } from '@/app/components/public/topic/InfoCard'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { TopicSection } from '@/app/components/public/topic/TopicSection'
import type {
  SpaceWeatherComponentId,
  SpaceWeatherContent,
  SunToEarthItemId,
} from '@/app/lib/space-weather'
import type { SpaceWeatherSection } from '@/app/lib/space-weather-section-schema'

import { CostaRicaSectionView } from './CostaRicaSectionView'
import { EditableCostaRicaSection } from './EditableCostaRicaSection'

const sunToEarthIcons: Record<SunToEarthItemId, LucideIcon> = {
  release: Sun,
  propagation: Orbit,
  response: Magnet,
  technology: Radio,
}

const componentIcons: Record<SpaceWeatherComponentId, LucideIcon> = {
  solarActivity: Sun,
  solarWind: Wind,
  magnetosphere: Magnet,
  ionosphere: Radio,
  storms: Zap,
  particles: Sparkles,
}

export interface SpaceWeatherPageProps {
  /** Every fixed string the page shows, already in the visitor's language. */
  content: SpaceWeatherContent
  /**
   * The "¿Por qué estudiarlo desde Costa Rica?" card as stored, in the visitor's language. Absent
   * when its row is missing: the card then shows the catalogue's text, with no edit controls.
   */
  costaRicaSection?: SpaceWeatherSection | null
  /** True for someone who may edit the Costa Rica card in "Modo edición". */
  canEditCostaRica?: boolean
}

export function SpaceWeatherPage({
  content,
  costaRicaSection,
  canEditCostaRica = false,
}: SpaceWeatherPageProps) {
  const {
    hero: spaceWeatherHero,
    definition: spaceWeatherDefinition,
    sunToEarth: spaceWeatherSunToEarth,
    costaRica: spaceWeatherCostaRica,
    components: spaceWeatherComponents,
    backLink: spaceWeatherBackLink,
  } = content

  return (
    <article className="topic-page">
      <TopicHero kicker={spaceWeatherHero.kicker} title={spaceWeatherHero.title} />

      <TopicSection title={spaceWeatherDefinition.title} titleId="sw-definition-title" wide>
        {spaceWeatherDefinition.paragraphs.map((paragraph) => (
          <p className="topic-intro" key={paragraph}>
            {paragraph}
          </p>
        ))}
      </TopicSection>

      <TopicSection index="1" title={spaceWeatherSunToEarth.title} titleId="sw-sun-to-earth-title">
        <CardGrid columns={2} equalHeight>
          {spaceWeatherSunToEarth.items.map((item, index) => {
            const Icon = sunToEarthIcons[item.id]

            return (
              <InfoCard
                description={item.description}
                icon={<Icon size={22} strokeWidth={1.8} />}
                key={item.id}
                title={`${index + 1}. ${item.title}`}
              />
            )
          })}
        </CardGrid>
      </TopicSection>

      <TopicSection
        index="2"
        intro={spaceWeatherComponents.intro}
        title={spaceWeatherComponents.title}
        titleId="sw-components-title"
        wide
      >
        <CardGrid columns={3} equalHeight>
          {spaceWeatherComponents.items.map((item) => {
            const Icon = componentIcons[item.id]

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
          caption={spaceWeatherComponents.flow.caption}
          steps={spaceWeatherComponents.flow.steps}
          title={spaceWeatherComponents.flow.title}
        />
      </TopicSection>

      {/* Visitors get the plain card: the editor, and its client code, only for an editor. */}
      {canEditCostaRica && costaRicaSection?.editing ? (
        <EditableCostaRicaSection canEdit section={costaRicaSection} />
      ) : (
        <CostaRicaSectionView section={costaRicaSection ?? spaceWeatherCostaRica} />
      )}

      <div className="topic-page-footer space-weather-footer page-width">
        <TopicBackLink href={spaceWeatherBackLink.href} label={spaceWeatherBackLink.label} />
      </div>
    </article>
  )
}
