import { Calendar, ExternalLink, GraduationCap, Images, MapPin } from 'lucide-react'

import { Button } from '@/app/components/public/Button'
import { CardGrid } from '@/app/components/public/topic/CardGrid'
import { InfoCard } from '@/app/components/public/topic/InfoCard'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { TopicSection } from '@/app/components/public/topic/TopicSection'
import type { AcademicActivity } from '@/app/lib/academic-activities'

export interface AcademicActivityPageProps {
  activity: AcademicActivity
  backHref?: string
  backLabel?: string
}

export function AcademicActivityPage({
  activity,
  backHref = '/noticias',
  backLabel = 'Volver a noticias',
}: AcademicActivityPageProps) {
  const hasMetadata = Boolean(activity.category || activity.date || activity.location)

  return (
    <article className="topic-page">
      <TopicHero kicker="Actividad académica" lead={activity.abstract} title={activity.title} />

      {hasMetadata ? (
        <TopicSection title="Información general" titleId="activity-info-title">
          <CardGrid columns={3} equalHeight>
            {activity.category ? (
              <InfoCard
                description={activity.category}
                icon={<GraduationCap size={22} strokeWidth={1.8} />}
                title="Tipo de actividad"
              />
            ) : null}
            {activity.date ? (
              <InfoCard
                description={activity.date}
                icon={<Calendar size={22} strokeWidth={1.8} />}
                title="Fecha"
              />
            ) : null}
            {activity.location ? (
              <InfoCard
                description={activity.location}
                icon={<MapPin size={22} strokeWidth={1.8} />}
                title="Lugar"
              />
            ) : null}
          </CardGrid>
        </TopicSection>
      ) : null}

      <TopicSection title="Descripción de la actividad" titleId="activity-description-title" wide>
        {activity.description.split('\n\n').map((paragraph, index) => (
          <p className="topic-intro" key={index}>
            {paragraph}
          </p>
        ))}
      </TopicSection>

      {activity.resources && activity.resources.length > 0 ? (
        <TopicSection title="Recursos y enlaces de interés" titleId="activity-resources-title" wide>
          <div className="activity-resources-action">
            {activity.resources.map((resource) => {
              const isExternal = resource.href.startsWith('http')
              return (
                <Button
                  href={resource.href}
                  icon={
                    isExternal ? (
                      <ExternalLink aria-hidden="true" size={16} strokeWidth={1.8} />
                    ) : (
                      <Images aria-hidden="true" size={16} strokeWidth={1.8} />
                    )
                  }
                  key={resource.href}
                  rel={isExternal ? 'noopener noreferrer' : undefined}
                  target={isExternal ? '_blank' : undefined}
                  variant="primary"
                >
                  {resource.label}
                </Button>
              )
            })}
          </div>
        </TopicSection>
      ) : null}

      <div className="topic-page-footer page-width">
        <TopicBackLink href={backHref} label={backLabel} />
      </div>
    </article>
  )
}
