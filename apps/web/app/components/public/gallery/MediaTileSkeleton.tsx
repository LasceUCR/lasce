import { Skeleton } from '@/app/components/public/skeleton/Skeleton'

/**
 * Stands in for one `.media-tile` of the album's masonry grid: a dark frame at the same fixed
 * row height, so the grid keeps its size while the real photographs and videos load.
 */
export function MediaTileSkeleton() {
  return (
    <li aria-hidden="true" className="media-tile">
      <Skeleton className="media-tile-frame" tone="dark" />
    </li>
  )
}
