import { Calendar, ExternalLink, GraduationCap, Images, MapPin } from 'lucide-react'
import { useTranslations } from 'next-intl'

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
  /** Defaults to "Volver a noticias" in the visitor's language. */
  backLabel?: string
}

export function AcademicActivityPage({
  activity,
  backHref = '/noticias',
  backLabel,
}: AcademicActivityPageProps) {
  const t = useTranslations('academicActivities.page')
  const hasMetadata = Boolean(activity.category || activity.date || activity.location)

  return (
    <article className="topic-page">
      <TopicHero kicker={t('kicker')} lead={activity.abstract} title={activity.title} />

      {hasMetadata ? (
        <TopicSection title={t('infoTitle')} titleId="activity-info-title">
          <CardGrid columns={3} equalHeight>
            {activity.category ? (
              <InfoCard
                description={activity.category}
                icon={<GraduationCap size={22} strokeWidth={1.8} />}
                title={t('type')}
              />
            ) : null}
            {activity.date ? (
              <InfoCard
                description={activity.date}
                icon={<Calendar size={22} strokeWidth={1.8} />}
                title={t('date')}
              />
            ) : null}
            {activity.location ? (
              <InfoCard
                description={activity.location}
                icon={<MapPin size={22} strokeWidth={1.8} />}
                title={t('location')}
              />
            ) : null}
          </CardGrid>
        </TopicSection>
      ) : null}

      <TopicSection title={t('descriptionTitle')} titleId="activity-description-title" wide>
        {activity.description.split('\n\n').map((paragraph, index) => (
          <p className="topic-intro" key={index}>
            {paragraph}
          </p>
        ))}
      </TopicSection>

      {activity.resources && activity.resources.length > 0 ? (
        <TopicSection title={t('resourcesTitle')} titleId="activity-resources-title" wide>
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
        <TopicBackLink href={backHref} label={backLabel ?? t('backToNews')} />
      </div>
    </article>
  )
}
