import { ExternalLink, Images } from 'lucide-react'

import { Button } from '@/app/components/public/Button'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
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
  return (
    <article className="topic-page academic-activity-page">
      <TopicHero kicker="Actividad académica" lead={activity.abstract} title={activity.title} />

      <div className="academic-activity-detail-body page-width">
        <div className="surface-card academic-activity-detail-card">
          <h2>Descripción de la actividad</h2>
          {activity.description.split('\n\n').map((paragraph, index) => (
            <p key={index} className="academic-activity-description-text">
              {paragraph}
            </p>
          ))}

          {activity.category ? (
            <p className="academic-activity-meta-line">
              <strong>Tipo de actividad:</strong> {activity.category}
            </p>
          ) : null}

          {activity.date ? (
            <p className="academic-activity-meta-line">
              <strong>Fecha:</strong> {activity.date}
            </p>
          ) : null}

          {activity.location ? (
            <p className="academic-activity-meta-line">
              <strong>Lugar:</strong> {activity.location}
            </p>
          ) : null}

          {activity.resources && activity.resources.length > 0 ? (
            <div className="academic-activity-resources">
              <h3>Recursos y enlaces de interés</h3>
              <ul className="academic-activity-resources-list">
                {activity.resources.map((resource) => {
                  const isExternal = resource.href.startsWith('http')
                  return (
                    <li key={resource.href}>
                      <Button
                        href={resource.href}
                        icon={
                          isExternal ? (
                            <ExternalLink aria-hidden="true" size={16} strokeWidth={1.8} />
                          ) : (
                            <Images aria-hidden="true" size={16} strokeWidth={1.8} />
                          )
                        }
                        rel={isExternal ? 'noopener noreferrer' : undefined}
                        target={isExternal ? '_blank' : undefined}
                        variant="primary"
                      >
                        {resource.label}
                      </Button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <div className="topic-page-footer page-width">
        <TopicBackLink href={backHref} label={backLabel} />
      </div>
    </article>
  )
}
