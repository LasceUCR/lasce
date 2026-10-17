import { useTranslations } from 'next-intl'

import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import type { AcademicActivity } from '@/app/lib/academic-activities'

import { AcademicActivityCard } from './AcademicActivityCard'

export interface AcademicActivitiesPageProps {
  activities: AcademicActivity[]
}

/**
 * The dedicated `/actividades-academicas` screen — same hero/back-link shell as every other
 * topic page, and the same `AcademicActivityCard` the `/noticias` teaser section uses, so both
 * surfaces stay visually identical without duplicating the card itself.
 */
export function AcademicActivitiesPage({ activities }: AcademicActivitiesPageProps) {
  const t = useTranslations('academicActivities')
  const listT = useTranslations('academicActivities.listPage')
  const common = useTranslations('common')

  return (
    <article className="topic-page">
      <TopicHero kicker={listT('kicker')} lead={listT('lead')} title={listT('title')} />

      {activities.length === 0 ? (
        <p className="content-empty page-width" role="status">
          {t('section.empty')}
        </p>
      ) : (
        <div className="academic-activities-list academic-activities-list-standalone page-width">
          {activities.map((activity) => (
            <AcademicActivityCard activity={activity} key={activity.slug} />
          ))}
        </div>
      )}

      <div className="topic-page-footer page-width">
        <TopicBackLink href="/" label={common('backToHome')} />
      </div>
    </article>
  )
}
