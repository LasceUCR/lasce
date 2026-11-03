import { useTranslations } from 'next-intl'

import { Notice } from '@/app/components/public/Notice'
import { LoadingRegion } from '@/app/components/public/skeleton/LoadingRegion'
import type { AcademicActivity } from '@/app/lib/academic-activities'

import { AcademicActivitiesListSkeleton } from './AcademicActivitiesListSkeleton'
import { AcademicActivityCard } from './AcademicActivityCard'

export interface AcademicActivitiesSectionProps {
  activities?: AcademicActivity[]
  loading?: boolean
  error?: string | null
  id?: string
}

export function AcademicActivitiesSection({
  activities = [],
  loading = false,
  error = null,
  id = 'academic-activities',
}: AcademicActivitiesSectionProps) {
  const t = useTranslations('academicActivities.section')

  return (
    <section
      aria-labelledby="academic-activities-title"
      className="academic-activities page-width"
      id={id}
    >
      <div className="section-heading">
        <h2 id="academic-activities-title">{t('title')}</h2>
        <p className="academic-activities-description">{t('description')}</p>
      </div>

      <LoadingRegion
        id="academic-activities-section-loading"
        label={t('loading')}
        loading={loading}
        skeleton={<AcademicActivitiesListSkeleton count={3} />}
      >
        {error ? (
          <Notice role="alert" tone="error">
            {error}
          </Notice>
        ) : activities.length === 0 ? (
          <p className="content-empty" role="status">
            {t('empty')}
          </p>
        ) : (
          <div className="academic-activities-list">
            {activities.map((activity) => (
              <AcademicActivityCard activity={activity} key={activity.id} />
            ))}
          </div>
        )}
      </LoadingRegion>
    </section>
  )
}
