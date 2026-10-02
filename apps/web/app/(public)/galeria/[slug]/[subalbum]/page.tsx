import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AlbumPage } from '@/app/components/public/gallery/AlbumPage'
import { userHasPermission } from '@/app/lib/auth/authorization'
import { albumPath, getAlbum, getSubAlbum, subAlbumParams } from '@/app/lib/gallery'

type SubAlbumRouteProps = {
  params: Promise<{ slug: string; subalbum: string }>
}

export const dynamicParams = false

export function generateStaticParams() {
  return subAlbumParams()
}

export async function generateMetadata({ params }: SubAlbumRouteProps): Promise<Metadata> {
  const { slug, subalbum } = await params
  const subAlbum = getSubAlbum(slug, subalbum)

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
  const album = getAlbum(slug)
  const subAlbum = getSubAlbum(slug, subalbum)
  const [canCreate, canEdit, canDelete] = await Promise.all([
    userHasPermission('create_components'),
    userHasPermission('edit_components'),
    userHasPermission('delete_components'),
  ])

  if (!album || !subAlbum) {
    notFound()
  }

  return (
    <AlbumPage
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
