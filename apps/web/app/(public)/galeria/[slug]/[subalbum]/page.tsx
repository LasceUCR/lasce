import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AlbumPage } from '@/app/components/public/gallery/AlbumPage'
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

  if (!album || !subAlbum) {
    notFound()
  }

  return (
    <AlbumPage
      backHref={albumPath(album.slug)}
      backLabel={`Volver a ${album.title}`}
      description={subAlbum.description}
      media={subAlbum.media}
      meta={`${subAlbum.media.length} archivos · ${album.title}`}
      title={subAlbum.title}
    />
  )
}
