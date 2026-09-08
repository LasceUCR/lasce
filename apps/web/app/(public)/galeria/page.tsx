import type { Metadata } from 'next'

import { GalleryPage } from '@/app/components/public/gallery/GalleryPage'
import { galeriaMeta } from '@/app/lib/gallery'

export const metadata: Metadata = {
  title: galeriaMeta.title,
  description: galeriaMeta.description,
}

export default function GaleriaRoute() {
  return <GalleryPage />
}
