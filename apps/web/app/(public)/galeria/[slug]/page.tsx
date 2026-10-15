import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getLocale } from 'next-intl/server'

import { AlbumPage } from '@/app/components/public/gallery/AlbumPage'
import { getSessionUser } from '@/app/lib/auth/session'
import { userHasPermission } from '@/app/lib/auth/authorization'
import { albumMeta, getGalleryAlbums } from '@/app/lib/gallery'
import { resolveLocale } from '@/app/lib/i18n/locale'

type AlbumRouteProps = {
  params: Promise<{ slug: string }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: AlbumRouteProps): Promise<Metadata> {
  const { slug } = await params
  const albums = await getGalleryAlbums(resolveLocale(await getLocale()))
  const album = albums.find((item) => item.slug === slug)

  if (!album) {
    return {}
  }

  return {
    title: `${album.title} | Galería LASCE`,
    description: album.description,
  }
}

export default async function AlbumRoute({ params }: AlbumRouteProps) {
  const { slug } = await params
  const [locale, canCreate, canEdit, canDelete, user] = await Promise.all([
    getLocale().then(resolveLocale),
    userHasPermission('create_components'),
    userHasPermission('edit_components'),
    userHasPermission('delete_components'),
    getSessionUser(),
  ])
  const albums = await getGalleryAlbums(locale, { includeEditingData: canEdit })
  const album = albums.find((item) => item.slug === slug)

  if (!album) {
    notFound()
  }

  return (
    <AlbumPage
      albumId={album.id}
      uploader={user?.fullName}
      canCreate={canCreate}
      canDelete={canDelete}
      canEdit={canEdit}
      description={album.description}
      media={album.media}
      meta={albumMeta(album)}
      parentSlug={album.slug}
      parentAlbumId={album.id}
      subAlbums={album.subAlbums}
      title={album.title}
    />
  )
}
