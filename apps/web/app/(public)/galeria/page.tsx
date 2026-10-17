import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'

import { GalleryPage } from '@/app/components/public/gallery/GalleryPage'
import { userHasPermission } from '@/app/lib/auth/authorization'
import { galeriaMeta, getGalleryAlbums } from '@/app/lib/gallery'
import { resolveLocale } from '@/app/lib/i18n/locale'

export const metadata: Metadata = {
  title: galeriaMeta.title,
  description: galeriaMeta.description,
}

export const dynamic = 'force-dynamic'

export default async function GaleriaRoute() {
  const [locale, canCreate, canEdit, canDelete] = await Promise.all([
    getLocale().then(resolveLocale),
    userHasPermission('create_components'),
    userHasPermission('edit_components'),
    userHasPermission('delete_components'),
  ])
  const albums = await getGalleryAlbums(locale, { includeEditingData: canEdit })

  return (
    <GalleryPage albums={albums} canCreate={canCreate} canDelete={canDelete} canEdit={canEdit} />
  )
}
