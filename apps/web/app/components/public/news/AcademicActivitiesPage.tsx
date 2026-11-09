import { useTranslations } from 'next-intl'

import { Notice } from '@/app/components/public/Notice'
import { LoadingRegion } from '@/app/components/public/skeleton/LoadingRegion'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import type { AcademicActivity } from '@/app/lib/academic-activities'

import { AcademicActivitiesListSkeleton } from './AcademicActivitiesListSkeleton'
import { AcademicActivityCard } from './AcademicActivityCard'

export interface AcademicActivitiesPageProps {
  activities?: AcademicActivity[]
  loading?: boolean
  error?: string | null
}

/**
 * The dedicated `/actividades-academicas` screen, with the standard topic hero and back link.
 * Each `AcademicActivityCard` keeps the full activity description in this separate listing.
 */
export function AcademicActivitiesPage({
  activities = [],
  loading = false,
  error = null,
}: AcademicActivitiesPageProps) {
  const t = useTranslations('academicActivities')
  const listT = useTranslations('academicActivities.listPage')
  const common = useTranslations('common')

  return (
    <article className="topic-page">
      <TopicHero kicker={listT('kicker')} lead={listT('lead')} title={listT('title')} />

      <LoadingRegion
        className="page-width"
        id="academic-activities-loading-region"
        label={t('section.loading')}
        loading={loading}
        skeleton={
          <AcademicActivitiesListSkeleton
            className="academic-activities-list-standalone"
            count={3}
          />
        }
      >
        {error ? (
          <Notice role="alert" tone="error">
            {error}
          </Notice>
        ) : activities.length === 0 ? (
          <p className="content-empty" role="status">
            {t('section.empty')}
          </p>
        ) : (
          <div className="academic-activities-list academic-activities-list-standalone">
            {activities.map((activity) => (
              <AcademicActivityCard
                activity={activity}
                key={activity.slug ?? (activity as { id?: string }).id}
              />
            ))}
          </div>
        )}
      </LoadingRegion>

      <div className="topic-page-footer page-width">
        <TopicBackLink href="/" label={common('backToHome')} />
      </div>
    </article>
  )
}
