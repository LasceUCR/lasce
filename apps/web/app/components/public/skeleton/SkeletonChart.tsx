import { Skeleton } from './Skeleton'
import styles from './Skeleton.module.css'

export interface SkeletonChartProps {
  /** Summary tiles above the chart (minimum, maximum, latest); 0 for none. */
  summaryTiles?: number
  /** Width over height of the chart area. */
  aspectRatio?: string
  className?: string
}

/**
 * Stands in for a time-series result: the summary tiles (`.data-summary`) and the chart with its
 * caption (`.data-chart-figure`), in the same boxes, so the result does not jump in when it loads.
 */
export function SkeletonChart({
  summaryTiles = 3,
  aspectRatio = '760 / 320',
  className,
}: SkeletonChartProps) {
  const tiles = Math.max(0, Math.floor(summaryTiles))

  return (
    <span aria-hidden="true" className={className ? `${styles.chart} ${className}` : styles.chart}>
      {tiles > 0 ? (
        <span className={styles.summary}>
          {Array.from({ length: tiles }, (_, index) => (
            <span className={styles.summaryTile} key={index}>
              <Skeleton shape="text" width="45%" />
              <Skeleton shape="text" width="70%" />
            </span>
          ))}
        </span>
      ) : null}
      <span className={styles.chartFigure}>
        <Skeleton aspectRatio={aspectRatio} className={styles.chartArea} />
        <Skeleton className={styles.chartCaption} shape="text" width="40%" />
      </span>
    </span>
  )
}
