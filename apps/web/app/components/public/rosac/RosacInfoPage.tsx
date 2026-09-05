import {
  ChartNoAxesCombined,
  Crosshair,
  GraduationCap,
  MapPin,
  Radio,
  RadioTower,
  Settings,
  Sun,
  Waves,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

import { Button } from '@/app/components/public/Button'
import { CardGrid } from '@/app/components/public/topic/CardGrid'
import { InfoCard } from '@/app/components/public/topic/InfoCard'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { TopicSection } from '@/app/components/public/topic/TopicSection'
import type { RosacCardIcon, RosacInfoContent } from '@/app/lib/rosac'

import styles from './RosacInfoPage.module.css'

const icons: Record<RosacCardIcon, LucideIcon> = {
  antenna: RadioTower,
  location: MapPin,
  frequency: Waves,
  sun: Sun,
  tracking: Crosshair,
  control: Settings,
  receiver: Radio,
  maintenance: Wrench,
  education: GraduationCap,
}

export interface RosacInfoPageProps {
  content: RosacInfoContent
}

export function RosacInfoPage({ content }: RosacInfoPageProps) {
  return (
    <article className="topic-page">
      <TopicHero {...content.hero} />

      <TopicSection title={content.overview.title} titleId="rosac-overview-title" wide>
        {content.overview.paragraphs.map((paragraph) => (
          <p className="topic-intro" key={paragraph}>
            {paragraph}
          </p>
        ))}
      </TopicSection>

      <TopicSection
        title={content.characteristics.title}
        titleId="rosac-characteristics-title"
        index="1"
      >
        <CardGrid columns={4} equalHeight>
          {content.characteristics.items.map((item) => {
            const Icon = icons[item.icon]
            return (
              <InfoCard
                key={item.id}
                title={item.title}
                description={item.description}
                icon={<Icon size={22} strokeWidth={1.8} />}
              />
            )
          })}
        </CardGrid>
      </TopicSection>

      <TopicSection title={content.activities.title} titleId="rosac-activities-title" index="2">
        <CardGrid columns={3} equalHeight>
          {content.activities.items.map((item) => {
            const Icon = icons[item.icon]
            return (
              <InfoCard
                key={item.id}
                title={item.title}
                description={item.description}
                icon={<Icon size={22} strokeWidth={1.8} />}
              />
            )
          })}
        </CardGrid>
      </TopicSection>

      <TopicSection
        title={content.radioObservation.title}
        titleId="rosac-radio-observation-title"
        index="3"
        wide
      >
        {content.radioObservation.paragraphs.map((paragraph) => (
          <p className="topic-intro" key={paragraph}>
            {paragraph}
          </p>
        ))}
      </TopicSection>

      <TopicSection title={content.relationship.title} titleId="rosac-relationship-title" featured>
        {content.relationship.paragraphs.map((paragraph) => (
          <p className="topic-intro" key={paragraph}>
            {paragraph}
          </p>
        ))}
      </TopicSection>

      <TopicSection
        title={content.scientificConsultation.title}
        titleId="rosac-science-title"
        intro={content.scientificConsultation.description}
      >
        <div className={styles.scientificAction}>
          <Button
            variant="secondary"
            icon={<ChartNoAxesCombined aria-hidden="true" size={20} strokeWidth={1.8} />}
          >
            {content.scientificConsultation.buttonLabel}
          </Button>
        </div>
      </TopicSection>

      <div className="topic-page-footer page-width">
        <TopicBackLink {...content.backLink} />
      </div>
    </article>
  )
}
