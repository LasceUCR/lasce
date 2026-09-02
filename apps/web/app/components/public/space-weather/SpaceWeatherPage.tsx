import {
  Magnet,
  Navigation,
  Power,
  Radio,
  Satellite,
  Sun,
  Wind,
  type LucideIcon,
} from 'lucide-react'

import { CardGrid } from '@/app/components/public/topic/CardGrid'
import { ConceptFlow } from '@/app/components/public/topic/ConceptFlow'
import { InfoCard } from '@/app/components/public/topic/InfoCard'
import { LineChart } from '@/app/components/public/topic/LineChart'
import { MetricCard } from '@/app/components/public/topic/MetricCard'
import { SplitPanel } from '@/app/components/public/topic/SplitPanel'
import { StatusPanel } from '@/app/components/public/topic/StatusPanel'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { TopicSection } from '@/app/components/public/topic/TopicSection'
import {
  spaceWeatherBackLink,
  spaceWeatherChart,
  spaceWeatherComponents,
  spaceWeatherHero,
  spaceWeatherImpacts,
  spaceWeatherIndicators,
  spaceWeatherLasce,
  spaceWeatherStatus,
} from '@/app/lib/space-weather'

const componentIcons: LucideIcon[] = [Sun, Wind, Magnet, Radio]
const impactIcons: LucideIcon[] = [Radio, Satellite, Navigation, Power]

export function SpaceWeatherPage() {
  return (
    <article className="topic-page">
      <TopicHero
        image={spaceWeatherHero.image}
        kicker={spaceWeatherHero.kicker}
        lead={spaceWeatherHero.introduction}
        notice={spaceWeatherHero.mockNotice}
        title={spaceWeatherHero.title}
      />

      <TopicSection
        index="1"
        intro={spaceWeatherComponents.intro}
        title={spaceWeatherComponents.title}
        titleId="sw-components-title"
      >
        <CardGrid>
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
        badge={spaceWeatherIndicators.mockLabel}
        index="2"
        title={spaceWeatherIndicators.title}
        titleId="sw-indicators-title"
      >
        <CardGrid>
          {spaceWeatherIndicators.items.map((item) => (
            <MetricCard
              detail={item.detail}
              key={item.label}
              label={item.label}
              status={item.status}
              tone={item.tone}
              updatedAt={spaceWeatherIndicators.updatedAt}
              value={item.value}
            />
          ))}
        </CardGrid>
      </TopicSection>

      <TopicSection index="3" title="Visualización y estado actual" titleId="sw-status-title">
        <SplitPanel>
          <LineChart
            description={spaceWeatherChart.description}
            points={spaceWeatherChart.points.map((point) => ({
              label: point.hour,
              value: point.kp,
            }))}
            threshold={{
              label: spaceWeatherChart.stormThresholdLabel,
              value: spaceWeatherChart.stormThreshold,
            }}
            title={spaceWeatherChart.title}
            yLabel={spaceWeatherChart.yLabel}
            yMax={9}
            yTicks={[0, 3, 5, 7, 9]}
          />
          <StatusPanel
            alerts={spaceWeatherStatus.alerts}
            forecast={spaceWeatherStatus.forecast}
            level={spaceWeatherStatus.level}
            levelDescription={spaceWeatherStatus.levelDescription}
            summary={spaceWeatherStatus.summary}
            title={spaceWeatherStatus.title}
          />
        </SplitPanel>
      </TopicSection>

      <TopicSection
        index="4"
        intro={spaceWeatherImpacts.intro}
        title={spaceWeatherImpacts.title}
        titleId="sw-impacts-title"
      >
        <CardGrid>
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

      <TopicSection className="topic-section-end" title={spaceWeatherLasce.title} titleId="sw-lasce-title">
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
