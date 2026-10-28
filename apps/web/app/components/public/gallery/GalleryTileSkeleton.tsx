import { Skeleton } from '@/app/components/public/skeleton/Skeleton'

import type { AlbumTileVariant } from './AlbumTile'

export interface GalleryTileSkeletonProps {
  variant?: AlbumTileVariant
}

/**
 * Stands in for one `AlbumTile`: the same 260px card, a 4:3 image placeholder and two text
 * lines (title, meta), so the grid keeps its size while the real tiles load.
 */
export function GalleryTileSkeleton({ variant = 'sub' }: GalleryTileSkeletonProps) {
  const classes = ['gallery-tile', `gallery-tile-${variant}`].join(' ')

  return (
    <div aria-hidden="true" className={classes}>
      <Skeleton aspectRatio="4 / 3" className="gallery-tile-media" />
      <div className="gallery-tile-body">
        <Skeleton shape="text" width={variant === 'cover' ? '70%' : '85%'} />
        <Skeleton shape="text" width="45%" />
      </div>
    </div>
  )
}
