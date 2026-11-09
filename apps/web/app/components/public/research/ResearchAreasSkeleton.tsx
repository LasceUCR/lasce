import { useTranslations } from 'next-intl'

import { Skeleton, SkeletonText } from '@/app/components/public/skeleton/Skeleton'

import styles from './ResearchAreasSkeleton.module.css'

/** Representative cards using the real list's responsive dimensions and shared motion rules. */
export function ResearchAreasSkeleton() {
  const t = useTranslations('researchAreas')

  return (
    <section className="research-areas page-width" aria-label={t('page.title')} aria-busy="true">
      <p className="sr-only" role="status">
        {t('loading')}
      </p>
      <ul className="research-area-list" aria-hidden="true" inert>
        {Array.from({ length: 3 }, (_, index) => (
          <li key={index}>
            <div className="surface-card research-area-card">
              <Skeleton className="research-area-card-image" height="100%" />
              <div className="research-area-card-content">
                <Skeleton height="1.35rem" width="70%" />
                <SkeletonText className={`research-area-card-description ${styles.description}`} />
                <div className={`research-area-card-action ${styles.action}`}>
                  <Skeleton height="2.5rem" />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
