import { Code, GraduationCap, Satellite, Sun, Users, Waves, type LucideIcon } from 'lucide-react'

import { CardGrid } from '@/app/components/public/topic/CardGrid'
import { ContentFlag } from '@/app/components/public/topic/ContentFlag'
import { InfoCard } from '@/app/components/public/topic/InfoCard'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { TopicSection } from '@/app/components/public/topic/TopicSection'
import type { NosotrosCardIcon, NosotrosContent } from '@/app/lib/nosotros'

const icons: Record<NosotrosCardIcon, LucideIcon> = {
  sun: Sun,
  waves: Waves,
  satellite: Satellite,
  code: Code,
  collaboration: Users,
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

      <TopicSection title={content.activities.title} titleId="nosotros-activities-title" index="1">
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
        title={content.contribution.title}
        titleId="nosotros-contribution-title"
        featured
      >
        {content.contribution.paragraphs.map((paragraph) => (
          <p className="topic-intro" key={paragraph}>
            {paragraph}
          </p>
        ))}
      </TopicSection>

      <TopicSection title={content.vision.title} titleId="nosotros-vision-title" wide>
        {content.vision.paragraphs.map((paragraph) => (
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
