import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AlbumPage } from '@/app/components/public/gallery/AlbumPage'
import { userHasPermission } from '@/app/lib/auth/authorization'
import { albumMeta, albumSlugs, getAlbum } from '@/app/lib/gallery'

type AlbumRouteProps = {
  params: Promise<{ slug: string }>
}

export const dynamicParams = false

export function generateStaticParams() {
  return albumSlugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: AlbumRouteProps): Promise<Metadata> {
  const { slug } = await params
  const album = getAlbum(slug)

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
  const album = getAlbum(slug)
  const [canCreate, canEdit, canDelete] = await Promise.all([
    userHasPermission('create_components'),
    userHasPermission('edit_components'),
    userHasPermission('delete_components'),
  ])

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
