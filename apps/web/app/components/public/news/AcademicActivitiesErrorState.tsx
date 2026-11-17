import { Button } from '@/app/components/public/Button'
import { Notice } from '@/app/components/public/Notice'

export interface AcademicActivitiesErrorStateProps {
  message: string
  retryLabel: string
  onRetry: () => void
}

export function AcademicActivitiesErrorState({
  message,
  retryLabel,
  onRetry,
}: AcademicActivitiesErrorStateProps) {
  return (
    <article className="topic-page">
      <div className="topic-page-footer page-width academic-activities-error-panel">
        <Notice role="alert" tone="error">
          {message}
        </Notice>
        <Button onClick={onRetry} variant="secondary">
          {retryLabel}
        </Button>
      </div>
    </article>
  )
}
