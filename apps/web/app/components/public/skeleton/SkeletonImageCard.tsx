import { Skeleton } from './Skeleton'
import styles from './Skeleton.module.css'

export interface SkeletonImageCardProps {
  /** Width over height of the image it stands for. Solar images are square. */
  aspectRatio?: string
  /** Leave out the caption line for images shown without one. */
  caption?: boolean
  className?: string
}

/**
 * Stands in for one image card of an image grid (`.data-image-grid`): a dark, square frame and a
 * caption line, with the same border, radius and padding, so the grid keeps its size when the
 * images arrive. Place one per item inside the grid the images will use.
 */
export function SkeletonImageCard({
  aspectRatio = '1 / 1',
  caption = true,
  className,
}: SkeletonImageCardProps) {
  return (
    <span
      aria-hidden="true"
      className={className ? `${styles.imageCard} ${className}` : styles.imageCard}
    >
      <Skeleton aspectRatio={aspectRatio} className={styles.imageFrame} tone="dark" />
      {caption ? (
        <span className={styles.imageCaption}>
          <Skeleton shape="text" width="60%" />
        </span>
      ) : null}
    </span>
  )
}
