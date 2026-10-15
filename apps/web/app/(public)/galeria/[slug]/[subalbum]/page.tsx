import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getLocale } from 'next-intl/server'

import { AlbumPage } from '@/app/components/public/gallery/AlbumPage'
import { getSessionUser } from '@/app/lib/auth/session'
import { userHasPermission } from '@/app/lib/auth/authorization'
import { albumPath, getGalleryAlbums } from '@/app/lib/gallery'
import { resolveLocale } from '@/app/lib/i18n/locale'

type SubAlbumRouteProps = {
  params: Promise<{ slug: string; subalbum: string }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: SubAlbumRouteProps): Promise<Metadata> {
  const { slug, subalbum } = await params
  const albums = await getGalleryAlbums(resolveLocale(await getLocale()))
  const album = albums.find((item) => item.slug === slug)
  const subAlbum = album?.subAlbums.find((item) => item.slug === subalbum)

  if (!subAlbum) {
    return {}
  }

  return {
    title: `${subAlbum.title} | Galería LASCE`,
    description: subAlbum.description,
  }
}

export default async function SubAlbumRoute({ params }: SubAlbumRouteProps) {
  const { slug, subalbum } = await params
  const [locale, canCreate, canEdit, canDelete, user] = await Promise.all([
    getLocale().then(resolveLocale),
    userHasPermission('create_components'),
    userHasPermission('edit_components'),
    userHasPermission('delete_components'),
    getSessionUser(),
  ])
  const albums = await getGalleryAlbums(locale, { includeEditingData: canEdit })
  const album = albums.find((item) => item.slug === slug)
  const subAlbum = album?.subAlbums.find((item) => item.slug === subalbum)

  if (!album || !subAlbum) {
    notFound()
  }

  return (
    <AlbumPage
      albumId={subAlbum.id}
      uploader={user?.fullName}
      backHref={albumPath(album.slug)}
      backLabel={`Volver a ${album.title}`}
      canCreate={canCreate}
      canDelete={canDelete}
      canEdit={canEdit}
      description={subAlbum.description}
      media={subAlbum.media}
      meta={`${subAlbum.media.length} archivos · ${album.title}`}
      title={subAlbum.title}
    />
  )
}
