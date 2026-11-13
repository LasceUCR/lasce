import { Skeleton, SkeletonText } from '@/app/components/public/skeleton/Skeleton'

import styles from './AcademicActivityCardSkeleton.module.css'

export interface AcademicActivityCardSkeletonProps {
  className?: string
}

/**
 * Placeholder shaped like `AcademicActivityCard`, displayed while academic activities are
 * being retrieved. Reuses `.news-card` metrics: 280px photo column with a minimum height of
 * 190px on desktop, and stacked 200px photo banner on mobile (<= 700px).
 *
 * Decorative only: it is hidden from assistive technologies (`aria-hidden="true"`) and contains
 * no focusable elements.
 */
export function AcademicActivityCardSkeleton({ className }: AcademicActivityCardSkeletonProps) {
  const cardClasses = [
    'surface-card',
    'news-card',
    'academic-activity-card',
    styles.card,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article aria-hidden="true" className={cardClasses}>
      <div className={`news-card-image ${styles.imageFrame}`}>
        <Skeleton className={styles.imageSkeleton} height="100%" width="100%" />
      </div>

      <div className="news-card-content">
        <div className="academic-activity-card-header">
          <Skeleton height="1.375rem" width="9rem" />
          <Skeleton height="1.375rem" width="4.5rem" />
        </div>

        <div className={styles.title}>
          <Skeleton height="1.35em" width="80%" />
        </div>

        <div className={styles.meta}>
          <Skeleton height="0.85em" width="45%" />
        </div>

        <div className="academic-activity-card-description">
          <SkeletonText lines={3} lastLineWidth="65%" />
        </div>
      </div>
    </article>
  )
}
