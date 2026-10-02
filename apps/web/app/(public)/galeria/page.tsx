import type { Metadata } from 'next'

import { GalleryPage } from '@/app/components/public/gallery/GalleryPage'
import { userHasPermission } from '@/app/lib/auth/authorization'
import { galeriaMeta, getGalleryAlbums } from '@/app/lib/gallery'

export const metadata: Metadata = {
  title: galeriaMeta.title,
  description: galeriaMeta.description,
}

export const dynamic = 'force-dynamic'

export default async function GaleriaRoute() {
  const [albums, canCreate, canEdit, canDelete] = await Promise.all([
    getGalleryAlbums(),
    userHasPermission('create_components'),
    userHasPermission('edit_components'),
    userHasPermission('delete_components'),
  ])

  return (
    <GalleryPage albums={albums} canCreate={canCreate} canDelete={canDelete} canEdit={canEdit} />
  )
}
