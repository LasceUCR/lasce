import { AcademicActivityCardSkeleton } from './AcademicActivityCardSkeleton'

export interface AcademicActivitiesListSkeletonProps {
  count?: number
  standalone?: boolean
  className?: string
}

/**
 * Placeholders for a list of academic activities while data is loading.
 * Kept inside the exact layout (`.academic-activities-list`) that loaded cards use,
 * avoiding layout shift.
 */
export function AcademicActivitiesListSkeleton({
  count = 3,
  standalone = false,
  className,
}: AcademicActivitiesListSkeletonProps) {
  const classes = [
    'academic-activities-list',
    standalone ? 'academic-activities-list-standalone page-width' : null,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes}>
      {Array.from({ length: Math.max(1, count) }, (_, index) => (
        <AcademicActivityCardSkeleton key={index} />
      ))}
    </div>
  )
}
