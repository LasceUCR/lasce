import { getTranslations } from 'next-intl/server'

import { GalleryPageSkeleton } from '@/app/components/public/gallery/GalleryPageSkeleton'

export default async function Loading() {
  const [hero, gallery, common] = await Promise.all([
    getTranslations('gallery.hero'),
    getTranslations('gallery.common'),
    getTranslations('common'),
  ])

  return (
    <GalleryPageSkeleton
      backLabel={common('backToHome')}
      kicker={hero('kicker')}
      label={gallery('loading')}
      lead={hero('lead')}
      title={hero('title')}
    />
  )
}
