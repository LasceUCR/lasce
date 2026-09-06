import { Antenna, GraduationCap, Radio, Settings, Sun, type LucideIcon } from 'lucide-react'

import { CardGrid } from '@/app/components/public/topic/CardGrid'
import { ContentFlag } from '@/app/components/public/topic/ContentFlag'
import { InfoCard } from '@/app/components/public/topic/InfoCard'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { TopicSection } from '@/app/components/public/topic/TopicSection'
import type { NosotrosCardIcon, NosotrosContent } from '@/app/lib/nosotros'

import { TeamGallery } from './TeamGallery'

const icons: Record<NosotrosCardIcon, LucideIcon> = {
  sun: Sun,
  radio: Radio,
  instruments: Settings,
  analysis: Antenna,
  education: GraduationCap,
}

export interface NosotrosPageProps {
  content: NosotrosContent
}

export function NosotrosPage({ content }: NosotrosPageProps) {
  return (
    <article className="topic-page">
      <TopicHero {...content.hero} />

      {content.flag ? <ContentFlag {...content.flag} /> : null}

      <TopicSection title={content.overview.title} titleId="nosotros-overview-title" wide>
        {content.overview.paragraphs.map((paragraph) => (
          <p className="topic-intro" key={paragraph}>
            {paragraph}
          </p>
        ))}
      </TopicSection>

      <TopicSection title={content.purpose.title} titleId="nosotros-purpose-title" wide>
        {content.purpose.paragraphs.map((paragraph) => (
          <p className="topic-intro" key={paragraph}>
            {paragraph}
          </p>
        ))}
      </TopicSection>

      <TopicSection
        title={content.focusAreas.title}
        titleId="nosotros-focus-title"
        intro={content.focusAreas.intro}
        index="1"
      >
        <CardGrid columns={3} equalHeight>
          {content.focusAreas.items.map((item) => {
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
        title={content.team.title}
        titleId="nosotros-team-title"
        intro={content.team.intro}
        index="2"
      >
        <TeamGallery label={content.team.title} people={content.team.people} />
      </TopicSection>

      <TopicSection title={content.institution.title} titleId="nosotros-institution-title" featured>
        {content.institution.paragraphs.map((paragraph) => (
          <p className="topic-intro" key={paragraph}>
            {paragraph}
          </p>
        ))}
      </TopicSection>

      <div className="topic-page-footer page-width">
        <TopicBackLink {...content.backLink} />
      </div>
    </article>
  )
}
