import { prisma } from '@lasce/db'
import type { NosotrosActivityIcon } from '@lasce/db'
import { z } from 'zod'

/**
 * Editorial source: institutional text supplied by LASCE, transcribed verbatim except where
 * noted. Institutional overview and purpose only. Work areas, solar astrophysics and space
 * weather each have their own page.
 *
 * One correction to the source: the "¿Qué hacemos?" bullet on computational tools read
 * "predicción del clima especial", which is a typo for "clima espacial". Corrected here;
 * confirm with LASCE.
 *
 * The short card titles in `activities` are editorial. The source is a plain bulleted list and
 * the card layout needs a heading, so each title is drawn from that bullet's own wording. The
 * bullet text itself is verbatim.
 *
 * ROSAC researchers live on `/radioastronomia`, not here. See `app/lib/rosac.ts`.
 */
export const nosotrosMeta = {
  title: 'Quiénes somos | LASCE',
  description:
    'El Laboratorio de Astrofísica Solar y Clima Espacial (LASCE), vinculado al Centro de Investigaciones Espaciales (CINESPA) de la Universidad de Costa Rica: qué es y qué investiga.',
} as const

export type NosotrosCardIcon =
  'sun' | 'waves' | 'satellite' | 'code' | 'collaboration' | 'education'

interface NosotrosTextSection {
  title: string
  paragraphs: readonly string[]
}

export interface NosotrosContent {
  hero: { kicker: string; title: string; lead: string }
  /** Provisional copy banner. Absent now that LASCE has supplied the approved text. */
  flag?: { label: string; message: string }
  overview: NosotrosTextSection
  activities: {
    title: string
    items: readonly {
      id: string
      icon: NosotrosCardIcon
      title: string
      description: string
    }[]
  }
  contribution: NosotrosTextSection
  vision: NosotrosTextSection
  backLink: { href: string; label: string }
}

export const nosotrosContent = {
  hero: {
    kicker: 'Portal público LASCE',
    title: 'Quiénes somos',
    lead: 'Laboratorio de Astrofísica Solar y Clima Espacial, vinculado al Centro de Investigaciones Espaciales (CINESPA) de la Universidad de Costa Rica.',
  },
  overview: {
    title: '¿Quiénes somos?',
    paragraphs: [
      'El Laboratorio de Astrofísica Solar y Clima Espacial (LASCE) es una iniciativa científica vinculada al Centro de Investigaciones Espaciales (CINESPA) de la Universidad de Costa Rica. Reúne investigación en astrofísica solar, observaciones astronómicas y desarrollo computacional para estudiar la actividad solar, su interacción con el medio interplanetario y el entorno terrestre.',
      'LASCE parte de una idea sencilla pero poderosa: para comprender el clima espacial se necesita observar distintos eslabones de una misma cadena, desde el origen magnético de una erupción solar hasta sus manifestaciones en el espacio cercano a la Tierra. Por ello, en el LASCE se realiza investigación científica integrando datos de diferentes instrumentos, longitudes de onda y plataformas.',
    ],
  },
  activities: {
    title: '¿Qué hacemos?',
    items: [
      {
        id: 'eruptive-phenomena',
        icon: 'sun',
        title: 'Fenómenos solares eruptivos',
        description:
          "Analizamos fenómenos solares eruptivos, como 'flares', eyecciones de masa coronal (CMEs, por sus siglas en inglés) y emisiones solares de radio.",
      },
      {
        id: 'solar-terrestrial',
        icon: 'waves',
        title: 'Perturbaciones y relación Sol-Tierra',
        description:
          'Estudiamos la evolución de perturbaciones solares y su relación con el viento solar, el campo magnético interplanetario y local, y la ionosfera.',
      },
      {
        id: 'observations',
        icon: 'satellite',
        title: 'Integración de observaciones',
        description:
          'Integramos mediciones propias con imágenes y datos de satélites, estaciones terrestres y observatorios internacionales.',
      },
      {
        id: 'computational-tools',
        icon: 'code',
        title: 'Herramientas computacionales',
        description:
          'Implementamos y desarrollamos herramientas computacionales para procesar datos, reconocer patrones y apoyar a la investigación en la predicción del clima espacial y su impacto en nuestro país.',
      },
      {
        id: 'collaboration',
        icon: 'collaboration',
        title: 'Colaboración interdisciplinaria',
        description:
          'Promovemos proyectos interdisciplinarios y colaboraciones nacionales e internacionales.',
      },
      {
        id: 'training',
        icon: 'education',
        title: 'Formación de estudiantes',
        description:
          'Creamos oportunidades de formación práctica para estudiantes mediante investigación, instrumentación, programación y análisis de datos.',
      },
    ],
  },
  contribution: {
    title: 'Aporte distintivo',
    paragraphs: [
      'LASCE busca que Costa Rica no sea únicamente usuaria de información internacional, sino también productora de datos, conocimiento y soluciones adaptadas a su ubicación y sus necesidades.',
    ],
  },
  vision: {
    title: 'Nuestra visión',
    paragraphs: [
      'Consolidar en Costa Rica un referente regional para la observación del Sol, el estudio de la relación Sol-Tierra y el desarrollo de herramientas de monitoreo y predicción del clima espacial. Esta visión combina excelencia científica, tecnología desarrollada con participación nacional, cooperación internacional, formación de talento y comunicación pública de la ciencia.',
    ],
  },
  backLink: {
    href: '/',
    label: 'Volver al inicio',
  },
} as const satisfies NosotrosContent

/**
 * The "¿Qué hacemos?" flashcards (LASCE-CON-012-086), persisted in
 * `nosotros_activities` — the only part of Nosotros backed by Postgres so
 * far. `icon` here is always the lowercase form used throughout the app
 * (`NosotrosCardIcon`); the database stores the uppercase Prisma enum member
 * instead, so every read/write through this module converts between the two.
 */
const ICON_TO_DB: Record<NosotrosCardIcon, NosotrosActivityIcon> = {
  sun: 'SUN',
  waves: 'WAVES',
  satellite: 'SATELLITE',
  code: 'CODE',
  collaboration: 'COLLABORATION',
  education: 'EDUCATION',
}

const ICON_FROM_DB: Record<NosotrosActivityIcon, NosotrosCardIcon> = {
  SUN: 'sun',
  WAVES: 'waves',
  SATELLITE: 'satellite',
  CODE: 'code',
  COLLABORATION: 'collaboration',
  EDUCATION: 'education',
}

export interface NosotrosActivityRecord {
  id: string
  icon: NosotrosCardIcon
  title: string
  description: string
  modifiedAt: string
}

type NosotrosActivityRow = {
  id: string
  icon: NosotrosActivityIcon
  title: string
  paragraph: string
  modifiedAt: Date
}

function toActivityRecord(row: NosotrosActivityRow): NosotrosActivityRecord {
  return {
    id: row.id,
    icon: ICON_FROM_DB[row.icon],
    title: row.title,
    description: row.paragraph,
    modifiedAt: row.modifiedAt.toISOString(),
  }
}

/**
 * Loads the activity flashcards from Postgres, in display order. Ordered by
 * `createdAt` rather than `modifiedAt` on purpose — editing a card's text
 * updates `modifiedAt` too, and that must not also move the card.
 */
export async function getNosotrosActivities(): Promise<NosotrosActivityRecord[]> {
  const rows = await prisma.nosotrosActivity.findMany({ orderBy: { createdAt: 'asc' } })
  return rows.map(toActivityRecord)
}

/** Shared by both create and update: an activity is always icon + title + text. */
export const nosotrosActivityInputSchema = z.object({
  icon: z.enum(['sun', 'waves', 'satellite', 'code', 'collaboration', 'education'], {
    error: 'Seleccione un ícono válido.',
  }),
  title: z.string().trim().min(1, 'El título es obligatorio.'),
  description: z.string().trim().min(1, 'El texto es obligatorio.'),
})

export type NosotrosActivityInput = z.infer<typeof nosotrosActivityInputSchema>

/**
 * Updates one activity flashcard and stamps `modifiedBy` with the admin who
 * made the change. Returns `null` when `id` does not match any row, rather
 * than throwing, so the route handler can turn that into a 404.
 */
export async function updateNosotrosActivity(
  id: string,
  data: NosotrosActivityInput,
  modifiedBy: string,
): Promise<NosotrosActivityRecord | null> {
  const existing = await prisma.nosotrosActivity.findUnique({ where: { id } })
  if (!existing) return null

  const row = await prisma.nosotrosActivity.update({
    where: { id },
    data: {
      icon: ICON_TO_DB[data.icon],
      title: data.title,
      paragraph: data.description,
      modifiedBy,
    },
  })

  return toActivityRecord(row)
}

/**
 * Creates a new activity flashcard, authored by the admin who submitted it.
 * `createdAt` defaults to now, which — since the list is ordered by it —
 * puts the new card at the end, same place `AddItemCard` prompted from.
 */
export async function createNosotrosActivity(
  data: NosotrosActivityInput,
  modifiedBy: string,
): Promise<NosotrosActivityRecord> {
  const row = await prisma.nosotrosActivity.create({
    data: {
      icon: ICON_TO_DB[data.icon],
      title: data.title,
      paragraph: data.description,
      modifiedBy,
    },
  })

  return toActivityRecord(row)
}

/**
 * Deletes one activity flashcard. Returns `false` when `id` does not match
 * any row, rather than throwing, so the route handler can turn that into a
 * 404 — same pre-check pattern as `updateNosotrosActivity`.
 */
export async function deleteNosotrosActivity(id: string): Promise<boolean> {
  const existing = await prisma.nosotrosActivity.findUnique({ where: { id } })
  if (!existing) return false

  await prisma.nosotrosActivity.delete({ where: { id } })
  return true
}
