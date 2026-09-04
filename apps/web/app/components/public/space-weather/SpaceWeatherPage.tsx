import {
  Magnet,
  Navigation,
  Orbit,
  Plane,
  Power,
  Radio,
  Satellite,
  Sparkles,
  Sun,
  Wind,
  Zap,
  type LucideIcon,
} from 'lucide-react'

import { CardGrid } from '@/app/components/public/topic/CardGrid'
import { ConceptFlow } from '@/app/components/public/topic/ConceptFlow'
import { InfoCard } from '@/app/components/public/topic/InfoCard'
import { ContentFlag } from '@/app/components/public/topic/ContentFlag'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicFigure } from '@/app/components/public/topic/TopicFigure'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { TopicSection } from '@/app/components/public/topic/TopicSection'
import {
  spaceWeatherBackLink,
  spaceWeatherComponents,
  spaceWeatherContentFlag,
  spaceWeatherHero,
  spaceWeatherImpacts,
  spaceWeatherLasce,
  spaceWeatherSolarActivity,
} from '@/app/lib/space-weather'

const componentIcons: LucideIcon[] = [Sun, Wind, Magnet, Radio, Zap, Sparkles]
const solarActivityIcons: LucideIcon[] = [Sun, Zap, Orbit]
const impactIcons: LucideIcon[] = [Radio, Satellite, Navigation, Power, Sparkles, Plane]

export function SpaceWeatherPage() {
  return (
    <article className="topic-page">
      <ContentFlag label={spaceWeatherContentFlag.label} message={spaceWeatherContentFlag.message} />
      <TopicHero
        image={spaceWeatherHero.image}
        kicker={spaceWeatherHero.kicker}
        lead={spaceWeatherHero.introduction}
        title={spaceWeatherHero.title}
      />

      <TopicSection
        index="1"
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
        index="2"
        intro={spaceWeatherSolarActivity.intro}
        title={spaceWeatherSolarActivity.title}
        titleId="sw-solar-title"
      >
        <TopicFigure
          alt={spaceWeatherSolarActivity.figure.alt}
          caption={spaceWeatherSolarActivity.figure.caption}
          src={spaceWeatherSolarActivity.figure.src}
        />
        <CardGrid columns={3} equalHeight tone="teal">
          {spaceWeatherSolarActivity.items.map((item, index) => {
            const Icon = solarActivityIcons[index] ?? Sun

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
      </TopicSection>

      <TopicSection
        index="3"
        intro={spaceWeatherImpacts.intro}
        title={spaceWeatherImpacts.title}
        titleId="sw-impacts-title"
      >
        <CardGrid columns={3} expandable>
          {spaceWeatherImpacts.items.map((item, index) => {
            const Icon = impactIcons[index] ?? Radio

            return (
              <InfoCard
                description={item.summary}
                icon={<Icon size={22} strokeWidth={1.8} />}
                key={item.title}
                more={item.more}
                title={item.title}
              />
            )
          })}
        </CardGrid>
      </TopicSection>

      <TopicSection
        className="topic-section-end"
        featured
        title={spaceWeatherLasce.title}
        titleId="sw-lasce-title"
      >
        {spaceWeatherLasce.paragraphs.map((paragraph) => (
          <p className="topic-intro" key={paragraph}>
            {paragraph}
          </p>
        ))}
        <TopicBackLink href={spaceWeatherBackLink.href} label={spaceWeatherBackLink.label} />
      </TopicSection>
    </article>
  )
}
