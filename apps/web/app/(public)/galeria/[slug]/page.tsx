import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AlbumPage } from '@/app/components/public/gallery/AlbumPage'
import { userHasPermission } from '@/app/lib/auth/authorization'
import { albumMeta, getGalleryAlbums } from '@/app/lib/gallery'

type AlbumRouteProps = {
  params: Promise<{ slug: string }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: AlbumRouteProps): Promise<Metadata> {
  const { slug } = await params
  const albums = await getGalleryAlbums()
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
  const [albums, canCreate, canEdit, canDelete] = await Promise.all([
    getGalleryAlbums(),
    userHasPermission('create_components'),
    userHasPermission('edit_components'),
    userHasPermission('delete_components'),
  ])
  const album = albums.find((item) => item.slug === slug)

  if (!album) {
    notFound()
  }

  return (
    <AlbumPage
      canCreate={canCreate}
      canDelete={canDelete}
      canEdit={canEdit}
      description={album.description}
      media={album.media}
      meta={albumMeta(album)}
      parentSlug={album.slug}
      subAlbums={album.subAlbums}
      title={album.title}
    />
  )
}
