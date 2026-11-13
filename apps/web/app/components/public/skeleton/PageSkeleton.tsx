import { LoadingRegion } from './LoadingRegion'
import { Skeleton, SkeletonText } from './Skeleton'
import styles from './Skeleton.module.css'

export interface PageSkeletonProps {
  /** Announced while the page loads, already translated. Defaults to `common.loading`. */
  label?: string
  /** How many content cards to sketch below the heading. */
  cards?: number
}

/**
 * The generic stand-in for a public page while the server renders it: a kicker, a title and a
 * lead in the same `.topic-hero` box every topic page opens with, then a grid of cards. It is the
 * fallback of `app/(public)/loading.tsx`, shown for every page without a skeleton of its own
 * (#475). A page whose layout differs a lot from this keeps or gets its own `loading.tsx`.
 */
export function PageSkeleton({ label, cards = 3 }: PageSkeletonProps) {
  return (
    <article className="topic-page">
      <LoadingRegion
        label={label}
        loading
        skeleton={
          <>
            <div className="topic-hero topic-hero-copy-only">
              <div className={styles.pageHeading}>
                <Skeleton shape="text" width="9rem" />
                <Skeleton height="2.5rem" width="min(28rem, 80%)" />
                <SkeletonText lines={2} />
              </div>
            </div>
            <div className={`page-width ${styles.pageCards}`}>
              {Array.from({ length: Math.max(0, Math.floor(cards)) }, (_, index) => (
                <span className={styles.pageCard} key={index}>
                  <Skeleton aspectRatio="16 / 9" />
                  <Skeleton shape="text" width="70%" />
                  <SkeletonText lines={3} />
                </span>
              ))}
            </div>
          </>
        }
      >
        {null}
      </LoadingRegion>
    </article>
  )
}
