import Image from 'next/image'
import { useTranslations } from 'next-intl'

import { TruncatedText } from '@/app/components/public/TruncatedText'
import type { AcademicActivity } from '@/app/lib/academic-activities'

export interface AcademicActivityCardProps {
  activity: AcademicActivity
}

/**
 * The full write-up lives in the card now — there is no separate detail page to send a reader to
 * — clamped to three lines through the shared `TruncatedText` component (the
 * `feature-g02-research-areas-read-more` standard) with its default "Leer más"/"Leer menos".
 */
export function AcademicActivityCard({ activity }: AcademicActivityCardProps) {
  const t = useTranslations('academicActivities.card')

  return (
    <article className="surface-card news-card academic-activity-card">
      <div className="news-card-image">
        <Image
          alt={activity.photoAlt}
          fill
          sizes="(max-width: 768px) 100vw, 320px"
          src={activity.photoUrl}
        />
      </div>

      <div className="news-card-content">
        <div className="academic-activity-card-header">
          <span className="academic-activity-badge">{t('badge')}</span>
          {activity.category ? (
            <span className="academic-activity-category">{activity.category}</span>
          ) : null}
        </div>

        <h3>{activity.title}</h3>

        <p className="news-meta">
          {activity.date}
          {activity.location ? ` · ${activity.location}` : ''}
        </p>

        {activity.description ? (
          <TruncatedText className="academic-activity-card-description" lines={3}>
            {activity.description}
          </TruncatedText>
        ) : null}
      </div>
    </article>
  )
}
