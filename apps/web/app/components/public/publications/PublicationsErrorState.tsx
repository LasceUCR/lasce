import { Button } from '@/app/components/public/Button'
import { Notice } from '@/app/components/public/Notice'

import styles from './PublicationsErrorState.module.css'

export interface PublicationsErrorStateProps {
  message: string
  retryLabel: string
  onRetry: () => void
}

/**
 * Rendered by `/publicaciones`'s `error.tsx` when `getPublicationsPage` throws, in place of the
 * skeleton or the listing it never loaded. `onRetry` reads the page from the server again.
 */
export function PublicationsErrorState({
  message,
  retryLabel,
  onRetry,
}: PublicationsErrorStateProps) {
  return (
    <article className="topic-page">
      <div className={`topic-page-footer page-width ${styles.panel}`}>
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
