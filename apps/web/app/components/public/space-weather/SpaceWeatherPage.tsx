import {
  Magnet,
  Orbit,
  Radio,
  Sparkles,
  Sun,
  Wind,
  Zap,
  type LucideIcon,
} from 'lucide-react'

import { CardGrid } from '@/app/components/public/topic/CardGrid'
import { ConceptFlow } from '@/app/components/public/topic/ConceptFlow'
import { InfoCard } from '@/app/components/public/topic/InfoCard'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { TopicSection } from '@/app/components/public/topic/TopicSection'
import {
  spaceWeatherBackLink,
  spaceWeatherComponents,
  spaceWeatherCostaRica,
  spaceWeatherDefinition,
  spaceWeatherHero,
  spaceWeatherSunToEarth,
} from '@/app/lib/space-weather'

const sunToEarthIcons: LucideIcon[] = [Sun, Orbit, Magnet, Radio]
const componentIcons: LucideIcon[] = [Sun, Wind, Magnet, Radio, Zap, Sparkles]

export function SpaceWeatherPage() {
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
            const Icon = sunToEarthIcons[index] ?? Sun

            return (
              <InfoCard
                description={item.description}
                icon={<Icon size={22} strokeWidth={1.8} />}
                key={item.title}
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
      >
        <CardGrid columns={3} equalHeight>
          {spaceWeatherComponents.items.map((item, index) => {
            const Icon = componentIcons[index] ?? Sun

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
          caption={spaceWeatherComponents.flow.caption}
          steps={spaceWeatherComponents.flow.steps}
          title={spaceWeatherComponents.flow.title}
        />
      </TopicSection>

      <TopicSection
        featured
        title={spaceWeatherCostaRica.title}
        titleId="sw-costa-rica-title"
      >
        {spaceWeatherCostaRica.paragraphs.map((paragraph) => (
          <p className="topic-intro" key={paragraph}>
            {paragraph}
          </p>
        ))}
      </TopicSection>

      <div className="topic-page-footer page-width">
        <TopicBackLink href={spaceWeatherBackLink.href} label={spaceWeatherBackLink.label} />
      </div>
    </article>
  )
}
