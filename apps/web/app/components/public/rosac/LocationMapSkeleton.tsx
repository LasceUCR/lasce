import { Skeleton } from '@/app/components/public/skeleton/Skeleton'

import styles from './RosacInfoPage.module.css'

export interface LocationMapSkeletonProps {
  /**
   * Announced while the map script loads. Leave it out when a parent already announces the load,
   * as `/contacto`'s page skeleton does.
   */
  label?: string
}

/**
 * The map's own box while Leaflet is still downloading. The address stays outside this
 * component, the same way a solar image keeps its caption and only the frame is a placeholder.
 */
export function LocationMapSkeleton({ label }: LocationMapSkeletonProps) {
  return (
    <div
      aria-busy={label ? true : undefined}
      className={`${styles.locationMapWrapper} surface-card`}
    >
      {label ? (
        <p className="sr-only" role="status">
          {label}
        </p>
      ) : null}
      <div aria-hidden="true" className={styles.locationMap}>
        <Skeleton className={styles.locationMapFill} />
      </div>
    </div>
  )
}
