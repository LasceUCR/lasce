import type { Metadata } from 'next'

import { GalleryPage } from '@/app/components/public/gallery/GalleryPage'
import { userHasPermission } from '@/app/lib/auth/authorization'
import { galeriaMeta } from '@/app/lib/gallery'

export const metadata: Metadata = {
  title: galeriaMeta.title,
  description: galeriaMeta.description,
}

export const dynamic = 'force-dynamic'

export default async function GaleriaRoute() {
  const [canCreate, canEdit, canDelete] = await Promise.all([
    userHasPermission('create_components'),
    userHasPermission('edit_components'),
    userHasPermission('delete_components'),
  ])

  return <GalleryPage canCreate={canCreate} canDelete={canDelete} canEdit={canEdit} />
}
