import { Mail, UserRound } from 'lucide-react'

import { CardGrid } from '@/app/components/public/topic/CardGrid'
import { InfoCard } from '@/app/components/public/topic/InfoCard'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { TopicSection } from '@/app/components/public/topic/TopicSection'
import type { TeamContent } from '@/app/lib/team'

export interface TeamPageProps {
  content: TeamContent
}

export function TeamPage({ content }: TeamPageProps) {
  const { team, background, acknowledgments } = content

  return (
    <article className="topic-page">
      <TopicHero {...content.hero} />
      <TopicSection id="equipo" intro={team.intro} title={team.title} titleId="equipo-titulo">
        <CardGrid columns={3} equalHeight>
          {team.members.map((member) => (
            <InfoCard
              description={
                <p>
                  <Mail aria-hidden="true" size={16} strokeWidth={1.8} />{' '}
                  <a
                    aria-label={`${team.emailLabel}: ${member.email}`}
                    href={`mailto:${member.email}`}
                  >
                    {member.email}
                  </a>
                </p>
              }
              icon={<UserRound aria-hidden="true" size={22} strokeWidth={1.8} />}
              key={member.email}
              title={member.name}
            />
          ))}
        </CardGrid>
      </TopicSection>
      <TopicSection id="contexto" title={background.title} titleId="contexto-titulo">
        <h3>{background.origin.title}</h3>
        <p>{background.origin.body}</p>
        <h3>{background.objectives.title}</h3>
        <p>{background.objectives.intro}</p>
        <ul>
          {background.objectives.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <h3>{background.process.title}</h3>
        <p>{background.process.body}</p>
      </TopicSection>
      <TopicSection
        id="agradecimientos"
        title={acknowledgments.title}
        titleId="agradecimientos-titulo"
      >
        <p>{acknowledgments.body}</p>
        <p>{acknowledgments.notice}</p>
      </TopicSection>
      <div className="topic-page-footer page-width">
        <TopicBackLink {...content.backLink} />
      </div>
    </article>
  )
}
