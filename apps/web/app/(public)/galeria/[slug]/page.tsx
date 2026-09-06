import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AlbumPage } from '@/app/components/public/gallery/AlbumPage'
import { albumSlugs, getAlbum } from '@/app/lib/gallery'

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

  if (!album) {
    notFound()
  }

  return <AlbumPage album={album} />
}
