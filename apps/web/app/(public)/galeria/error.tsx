'use client'

import { useTranslations } from 'next-intl'

import { GalleryErrorState } from '@/app/components/public/gallery/GalleryErrorState'

export interface GalleryErrorProps {
  /** Next passes the thrown error; the message shown to visitors is fixed, not this one. */
  error: Error & { digest?: string }
  reset: () => void
}

// Catches a thrown `getGalleryAlbums` (e.g. the database is unreachable) for `/galeria` and every
// route nested under it, since none of them define an `error.tsx` of their own.
export default function GalleryError({ reset }: GalleryErrorProps) {
  const t = useTranslations('gallery.common')

  return <GalleryErrorState message={t('loadError')} onRetry={reset} retryLabel={t('retry')} />
}
