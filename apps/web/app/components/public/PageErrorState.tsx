'use client'

import { useTranslations } from 'next-intl'

import { Button } from './Button'
import { Notice } from './Notice'

export interface PageErrorStateProps {
  /** Next's own `reset()`: renders the route again and retries what failed. */
  onRetry: () => void
}

/**
 * Shown by `app/(public)/error.tsx` when a public page fails to render on the server, so a
 * failed navigation ends on a page that says so instead of leaving the previous one on screen
 * (#475). A section with its own `error.tsx` (`/galeria`, `/publicaciones`, ...) keeps it.
 */
export function PageErrorState({ onRetry }: PageErrorStateProps) {
  const t = useTranslations('shell.pageError')

  return (
    <article className="topic-page">
      <div className="topic-page-footer page-width">
        <Notice role="alert" tone="error">
          {t('message')}
        </Notice>
        <div className="hero-actions">
          <Button onClick={onRetry} variant="secondary">
            {t('retry')}
          </Button>
          <Button href="/" variant="primary">
            {t('home')}
          </Button>
        </div>
      </div>
    </article>
  )
}
