'use client'

import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

import styles from './Skeleton.module.css'

export interface LoadingRegionProps {
  /** While true the placeholders show; once false, `children` replace them. */
  loading: boolean
  /** Placeholders shaped like the content: `Skeleton`, `SkeletonText`, `SkeletonImageCard`, ... */
  skeleton: ReactNode
  /** What finished loading: the content, or the empty or error state. */
  children: ReactNode
  /** Announced while loading, already translated. Defaults to `common.loading` ("Cargando…"). */
  label?: string
  /**
   * Set to `false` when something else on the page already announces this load (a progress bar
   * with its own status), so a screen reader does not hear it twice. The area is still busy.
   */
  announce?: boolean
  className?: string
  id?: string
}

/**
 * The area of a view whose content is loading. While `loading`:
 *
 * - it is marked `aria-busy`, and a polite status announces `label`;
 * - the placeholders are hidden from assistive technology and `inert`, so nothing in them can
 *   take focus, even a control passed by mistake.
 *
 * Once `loading` is false it renders `children` and is no longer busy. Deciding between the
 * content, the empty state and the error state stays with the caller, as does making sure the
 * request ends (`loading` must not stay true after a failure).
 *
 * The status region is always mounted: a screen reader only announces a change to a live region
 * that already exists.
 */
export function LoadingRegion({
  loading,
  skeleton,
  children,
  label,
  announce = true,
  className,
  id,
}: LoadingRegionProps) {
  const t = useTranslations('common')

  return (
    <div aria-busy={loading || undefined} className={className} id={id}>
      {announce ? (
        <p className="sr-only" role="status">
          {loading ? (label ?? t('loading')) : null}
        </p>
      ) : null}
      {loading ? (
        <div aria-hidden="true" className={styles.placeholders} inert>
          {skeleton}
        </div>
      ) : (
        children
      )}
    </div>
  )
}
