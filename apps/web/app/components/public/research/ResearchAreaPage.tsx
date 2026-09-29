import type { ResearchArea } from './ResearchAreasSection'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'

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
      <TopicHero kicker="Área de investigación" lead={area.description} title={area.title} />

      <div className="topic-page-footer page-width">
        <TopicBackLink href={backHref} label={backLabel} />
      </div>
    </article>
  )
}
