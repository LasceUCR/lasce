import { getTranslations } from 'next-intl/server'

import { AlbumPageSkeleton } from '@/app/components/public/gallery/AlbumPageSkeleton'

export default async function Loading() {
  const [common, albumPage] = await Promise.all([
    getTranslations('gallery.common'),
    getTranslations('gallery.albumPage'),
  ])

  return (
    <AlbumPageSkeleton
      kicker={common('gallery')}
      label={common('loadingAlbum')}
      mediaTitle={albumPage('albumContent')}
      subalbumsTitle={common('subalbumsTitle')}
    />
  )
}
