import { useTranslations } from 'next-intl'

import type { AcademicActivity } from '@/app/lib/academic-activities'

import { AcademicActivityCard } from './AcademicActivityCard'

export interface AcademicActivitiesSectionProps {
  activities: AcademicActivity[]
  id?: string
}

export function AcademicActivitiesSection({
  activities,
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

      {activities.length === 0 ? (
        <p className="content-empty" role="status">
          {t('empty')}
        </p>
      ) : (
        <div className="academic-activities-list">
          {activities.map((activity) => (
            <AcademicActivityCard activity={activity} key={activity.slug} />
          ))}
        </div>
      )}
    </section>
  )
}
