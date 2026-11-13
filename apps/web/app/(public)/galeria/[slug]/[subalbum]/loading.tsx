import { getTranslations } from 'next-intl/server'

import { AlbumPageSkeleton } from '@/app/components/public/gallery/AlbumPageSkeleton'

// A sub-album page never lists children of its own (see `[subalbum]/page.tsx`).
export default async function Loading() {
  const [common, albumPage] = await Promise.all([
    getTranslations('gallery.common'),
    getTranslations('gallery.albumPage'),
  ])

  return (
    <AlbumPageSkeleton
      hasSubAlbums={false}
      kicker={common('gallery')}
      label={common('loadingAlbum')}
      mediaTitle={albumPage('albumContent')}
      subalbumsTitle={common('subalbumsTitle')}
    />
  )
}
