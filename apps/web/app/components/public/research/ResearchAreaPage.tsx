import type { ResearchArea } from './ResearchAreasSection'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { TopicSection } from '@/app/components/public/topic/TopicSection'

export interface ResearchAreaPageProps {
  area: ResearchArea
  backHref?: string
  backLabel?: string
}

export function ResearchAreaPage({
  area,
  backHref = '/investigacion',
  backLabel = 'Volver a áreas de investigación',
}: ResearchAreaPageProps) {
  return (
    <article className="topic-page">
      <div className="gallery-album-back page-width">
        <TopicBackLink href={backHref} label={backLabel} />
      </div>

      <TopicHero
        kicker="Área de investigación"
        lead={area.lead ?? area.description}
        title={area.title}
      />

      {area.objectives && area.objectives.length > 0 ? (
        <TopicSection title="Objetivos" titleId="area-objectives">
          <ul className="research-area-list" aria-labelledby="area-objectives">
            {area.objectives.map((objective) => (
              <li key={objective}>{objective}</li>
            ))}
          </ul>
        </TopicSection>
      ) : null}

      {area.scope ? (
        <TopicSection title="Alcance" titleId="area-scope">
          <p className="topic-intro">{area.scope}</p>
        </TopicSection>
      ) : null}

      {area.topics && area.topics.length > 0 ? (
        <TopicSection title="Temas de investigación" titleId="area-topics">
          <ul className="research-area-list" aria-labelledby="area-topics">
            {area.topics.map((topic) => (
              <li key={topic}>{topic}</li>
            ))}
          </ul>
        </TopicSection>
      ) : null}

      <div className="topic-page-footer page-width">
        <TopicBackLink href={backHref} label={backLabel} />
      </div>
    </article>
  )
}
