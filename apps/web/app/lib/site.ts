import { academicActivitySlugs } from './academic-activities'
import { getGalleryPaths } from './gallery'
import { workAreaPath, workAreaSlugs } from './work-areas'

export const siteUrl = new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')

export const publicPaths = [
  '/',
  '/nosotros',
  '/colaboraciones-e-iniciativas',
  '/investigacion',
  '/herramientas-cientificas',
  '/datos',
  '/galeria',
  '/noticias',
  '/contacto',
  '/acceso',
  '/actividades-academicas',
  ...workAreaSlugs.map((slug) => workAreaPath(slug)),
  ...academicActivitySlugs.map((slug) => `/noticias/actividades/${slug}`),
] as const

/** Every public page, with the gallery's albums read from the database so deletions and additions show. */
export async function getPublicPaths(): Promise<string[]> {
  return [...publicPaths, ...(await getGalleryPaths())]
}
