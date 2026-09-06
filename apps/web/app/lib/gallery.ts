/**
 * Mock content for the public gallery. The shape mirrors what a real source
 * (Postgres rows plus MinIO objects) would return, so wiring one in later is a
 * change to this module alone: every component below receives its data as
 * props or reads these exports directly.
 *
 * `src` is optional on purpose. No photographs have been contributed yet, so
 * every tile currently renders the placeholder frame; filling `src` in with a
 * path under `public/images/galeria/` is all it takes to show a real image.
 */

export interface GalleryMedia {
  id: string
  title: string
  description: string
  /** Capture date, already formatted for display in Spanish. */
  date: string
  /** File format as shown to visitors: JPG, MP4, PNG, FITS… */
  format: string
  uploader: string
  isVideo: boolean
  /** Tile footprint in the masonry grid. */
  colSpan: 1 | 2
  rowSpan: 1 | 2
  src?: string
}

export interface GallerySubAlbum {
  id: string
  title: string
  count: number
  src?: string
}

export interface GalleryAlbum {
  slug: string
  title: string
  description: string
  /** Summary line: sub-albums, file count and the years covered. */
  meta: string
  subAlbums: readonly GallerySubAlbum[]
  media: readonly GalleryMedia[]
  src?: string
}

/**
 * One block on the gallery index: a cover tile plus its sub-albums. A group
 * links to a detail page only when `albumSlug` names an album that exists.
 */
export interface GalleryGroup {
  id: string
  title: string
  description: string
  meta: string
  subAlbums: readonly GallerySubAlbum[]
  albumSlug?: AlbumSlug
  src?: string
}

export const albumSlugs = ['rosac'] as const

export type AlbumSlug = (typeof albumSlugs)[number]

export const galeriaMeta = {
  title: 'Galería | LASCE',
  description:
    'Fotografías y video de las actividades del Laboratorio de Ciencias Espaciales: construcción e instrumentación, observación y vida cotidiana del equipo.',
} as const

export const galeriaHero = {
  kicker: 'Portal público LASCE',
  title: 'Galería',
  lead: 'Fotografías y video de las actividades del laboratorio: construcción e instrumentación, observación y vida cotidiana del equipo. Organizada por álbumes.',
} as const

const rosacSubAlbums = [
  { id: 'cimentacion', title: 'Cimentación e instalación de la antena', count: 18 },
  { id: 'receptor', title: 'Pruebas del receptor', count: 14 },
  { id: 'calibracion', title: 'Alineación y calibración', count: 10 },
] as const satisfies readonly GallerySubAlbum[]

const rosacMedia = [
  {
    id: 'm1',
    title: 'Llegada de los componentes del ROSAC',
    description: 'Descarga del contenedor con las piezas del reflector principal.',
    date: '15 ene 2025',
    format: 'JPG',
    uploader: 'Andrés Solano',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
  },
  {
    id: 'm2',
    title: 'Ensamblaje del reflector parabólico',
    description: 'Registro en video del armado de los paneles del reflector.',
    date: '22 ene 2025',
    format: 'MP4',
    uploader: 'Fabián Alvarado',
    isVideo: true,
    colSpan: 2,
    rowSpan: 1,
  },
  {
    id: 'm3',
    title: 'Cimentación de la plataforma',
    description: 'Vaciado de concreto para la base de la antena.',
    date: '3 feb 2025',
    format: 'JPG',
    uploader: 'María Rodríguez',
    isVideo: false,
    colSpan: 1,
    rowSpan: 2,
  },
  {
    id: 'm4',
    title: 'Instalación del mástil de soporte',
    description: 'Colocación del mástil central antes del montaje del reflector.',
    date: '10 feb 2025',
    format: 'JPG',
    uploader: 'Andrés Solano',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
  },
  {
    id: 'm5',
    title: 'Cableado del sistema RF',
    description: 'Tendido de cables de radiofrecuencia hacia la sala de control.',
    date: '18 feb 2025',
    format: 'PNG',
    uploader: 'Fabián Alvarado',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
  },
  {
    id: 'm6',
    title: 'Prueba del receptor de banda X',
    description: 'Verificación del receptor antes de la instalación final.',
    date: '1 mar 2025',
    format: 'MP4',
    uploader: 'María Rodríguez',
    isVideo: true,
    colSpan: 1,
    rowSpan: 2,
  },
  {
    id: 'm7',
    title: 'Alineación óptica del reflector',
    description: 'Ajuste fino de la orientación del reflector principal.',
    date: '9 mar 2025',
    format: 'JPG',
    uploader: 'Andrés Solano',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
  },
  {
    id: 'm8',
    title: 'Captura de calibración',
    description: 'Datos crudos de calibración del receptor en formato FITS.',
    date: '15 mar 2025',
    format: 'FITS',
    uploader: 'Fabián Alvarado',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
  },
  {
    id: 'm9',
    title: 'Equipo de campo en el sitio',
    description: 'El equipo técnico durante una jornada de trabajo en sitio.',
    date: '20 mar 2025',
    format: 'JPG',
    uploader: 'María Rodríguez',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
  },
  {
    id: 'm10',
    title: 'Conexión con la sala de control',
    description: 'Prueba de enlace entre la antena y la sala de control.',
    date: '2 abr 2025',
    format: 'MP4',
    uploader: 'Andrés Solano',
    isVideo: true,
    colSpan: 2,
    rowSpan: 1,
  },
  {
    id: 'm11',
    title: 'Primera señal recibida',
    description: 'El equipo confirma la primera recepción de datos del ROSAC.',
    date: '18 abr 2025',
    format: 'JPG',
    uploader: 'Fabián Alvarado',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
  },
  {
    id: 'm12',
    title: 'Panorámica del sitio al atardecer',
    description: 'Vista general del observatorio al finalizar la instalación.',
    date: '30 abr 2025',
    format: 'JPG',
    uploader: 'María Rodríguez',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
  },
  {
    id: 'm13',
    title: 'Placa de inauguración',
    description: 'Colocación de la placa conmemorativa del ROSAC.',
    date: '5 may 2025',
    format: 'JPG',
    uploader: 'Andrés Solano',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
  },
] as const satisfies readonly GalleryMedia[]

export const galleryAlbums = {
  rosac: {
    slug: 'rosac',
    title: 'Construcción del ROSAC',
    description:
      'Documentación del ensamblaje y puesta en marcha del Radio Observatorio Solar y de Clima Espacial (ROSAC).',
    meta: '3 subálbumes · 42 archivos · 2025–2026',
    subAlbums: rosacSubAlbums,
    media: rosacMedia,
  },
} as const satisfies Record<AlbumSlug, GalleryAlbum>

export const galleryGroups = [
  {
    id: 'rosac',
    title: 'Construcción del ROSAC',
    description: 'Documentación del ensamblaje y puesta en marcha del ROSAC.',
    meta: '3 subálbumes · 42 archivos · 2025–2026',
    subAlbums: rosacSubAlbums,
    albumSlug: 'rosac',
  },
  {
    id: 'laboratorio',
    title: 'Actividades del laboratorio',
    description: 'Visitas guiadas, talleres y trabajo cotidiano del equipo de LASCE.',
    meta: '2 subálbumes · 23 archivos · 2026',
    subAlbums: [
      { id: 'visitas', title: 'Visitas guiadas', count: 9 },
      { id: 'talleres', title: 'Talleres y capacitación', count: 7 },
    ],
  },
  {
    id: 'eclipse',
    title: 'Eclipse solar del 8 de abril',
    description: 'Observación y registro del eclipse desde el campus.',
    meta: '16 archivos · abril 2026',
    subAlbums: [],
  },
] as const satisfies readonly GalleryGroup[]

export function albumPath(slug: AlbumSlug): `/galeria/${AlbumSlug}` {
  return `/galeria/${slug}`
}

export function isAlbumSlug(value: string): value is AlbumSlug {
  return albumSlugs.includes(value as AlbumSlug)
}

export function getAlbum(slug: string): GalleryAlbum | null {
  return isAlbumSlug(slug) ? galleryAlbums[slug] : null
}

/** The "N archivos en este álbum" counter shown beside the media grid. */
export function albumMediaMeta(album: GalleryAlbum): string {
  return `${album.media.length} archivos en este álbum`
}

/** Placeholder caption for a media tile that has no image yet. */
export function mediaPlaceholder(item: GalleryMedia): string {
  return `${item.isVideo ? 'Video' : 'Foto'}: ${item.title}`
}
