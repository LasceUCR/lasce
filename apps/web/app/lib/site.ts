import { albumPath, albumSlugs } from './gallery'
import { workAreaPath, workAreaSlugs } from './work-areas'

export const siteUrl = new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')

export const publicPaths = [
  '/',
  '/nosotros',
  '/investigacion',
  '/instrumentacion',
  '/datos',
  '/galeria',
  '/noticias',
  '/contacto',
  ...workAreaSlugs.map((slug) => workAreaPath(slug)),
  ...albumSlugs.map((slug) => albumPath(slug)),
] as const
