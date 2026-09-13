import { albumPath, galleryAlbumList, subAlbumPath } from './gallery'
import { workAreaPath, workAreaSlugs } from './work-areas'

export const siteUrl = new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')

const galleryPaths = galleryAlbumList.flatMap((album) => [
  albumPath(album.slug),
  ...album.subAlbums.map((subAlbum) => subAlbumPath(album.slug, subAlbum.slug)),
])

export const publicPaths = [
  '/',
  '/nosotros',
  '/investigacion',
  '/instrumentacion',
  '/datos',
  '/galeria',
  '/noticias',
  '/contacto',
  '/registro',
  ...workAreaSlugs.map((slug) => workAreaPath(slug)),
  ...galleryPaths,
] as const
