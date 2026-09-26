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
 * LASCE researchers live here (`researchers.people`). Portraits are the named files in
 * `public/images/Researchers/`, except Dra. Carolina Salas Matamoros, who reuses the ROSAC
 * portrait. People without a supplied portrait use `User.png`. The rest of the ROSAC team stays
 * on `/radioastronomia`. See `app/lib/rosac.ts`.
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

export interface NosotrosResearcher {
  /** Local path under `apps/web/public`. */
  src: string
  name: string
  /** The category shown at the top of the card, for example `Investigador`. */
  role: string
  /** Public address, or several, when LASCE supplied them. */
  email?: string | readonly string[]
  /** Affiliation shown as `Institución: {institution}`. */
  institution: string
  description?: string
}

export interface NosotrosContent {
  hero: { kicker: string; title: string; lead: string }
  /** Provisional copy banner. Absent now that LASCE has supplied the approved text. */
  flag?: { label: string; message: string }
  overview: NosotrosTextSection
  researchers: {
    title: string
    intro: string
    hint: string
    emptyMessage: string
    people: readonly NosotrosResearcher[]
  }
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
  researchers: {
    title: 'Investigadores LASCE',
    intro:
      'Las personas que investigan y desarrollan el Laboratorio de Astrofísica Solar y Clima Espacial (LASCE).',
    hint: 'Haga clic en una ficha para ver más información.',
    emptyMessage: 'No hay información de investigadores disponible en este momento.',
    people: [
      {
        src: '/images/ROSAC/team/CarolinaSalas.jpg',
        name: 'Dra. Carolina Salas Matamoros',
        role: 'Investigadora principal',
        email: 'carolina.salas_mata@ucr.ac.cr',
        institution: 'Centro de Investigaciones Espaciales, CINESPA',
        description:
          'Además de desempeñarse como investigadora principal, orienta la definición de las líneas de investigación, coordina la integración entre astrofísica solar, radioastronomía, clima espacial, análisis de datos e inteligencia artificial; y vincula el trabajo científico con el desarrollo de infraestructura y capacidades de observación propias, particularmente mediante el radiotelescopio ROSAC. Su experiencia en el estudio conjunto de flares, emisiones de rayos X, eyecciones de masa coronal y predicción de tiempos de llegada de ICMEs a la Tierra, proporciona la base científica para impulsar herramientas de monitoreo y pronóstico adaptadas a Costa Rica. Asimismo, promueve la colaboración interdisciplinaria e internacional, la formación de estudiantes y jóvenes investigadores, y la transferencia del conocimiento científico hacia aplicaciones que permitan comprender y anticipar los efectos de la actividad solar sobre el entorno terrestre y los sistemas tecnológicos.',
      },
      {
        src: '/images/Researchers/FelipeMeza.jpg',
        name: 'Dr. Felipe Meza',
        role: 'Investigador colaborador',
        email: 'felipe.mezaobando@ucr.ac.cr',
        institution:
          'Escuela de Ingeniería Mecatrónica, TEC; Laboratorio de Inteligencia Artificial para las Ciencias Naturales (LIANA), TEC; Centro de Investigaciones Espaciales, UCR',
        description:
          'Desarrollo de modelos inteligentes para el análisis, interpretación y predicción de señales asociadas a fenómenos de clima espacial, integrando inteligencia artificial, procesamiento de señales y radioastronomía solar.',
      },
      {
        src: '/images/Researchers/AllanBerrocal.jpg',
        name: 'Dr. Allan Francisco Berrocal Rojas',
        role: 'Investigador colaborador',
        email: 'allan.berrocal@ucr.ac.cr',
        institution: 'Escuela de Ciencias de la Computación e Informática, UCR',
        description:
          'Diseño, desarrollo e implementación de la plataforma informática del LASCE. Las tareas puntuales abarcan la captura de datos masivos de diferentes fuentes con información sobre el clima solar, el almacenamiento de los datos procesados y de interés para el proyecto en sistemas de bases de datos adecuadas para el dominio, y finalmente la habilitación de una interfaz de consulta mediante servicios web. Adicionalmente apoyar en los objetivos de análisis de datos sobre el clima solar junto a investigadores(as) especialistas en la materia como astrofísicos(as) solares.',
      },
      {
        src: '/images/Researchers/LuisEsquivel.jpeg',
        name: 'Dr. Luis Gustavo Esquivel Quirós',
        role: 'Investigador colaborador',
        email: 'luis.esquivel@ucr.ac.cr',
        institution: 'Escuela de Ciencias de la Computación e Informática, UCR',
      },
      {
        src: '/images/Researchers/User.png',
        name: 'MSc. Alonso Vega',
        role: 'Investigador colaborador',
        email: 'alonso.vega_f@ucr.ac.cr',
        institution: 'Escuela de Ingeniería Topográfica, UCR',
        description:
          'Procesamiento y análisis de datos GNSS provenientes de estaciones de operación continua colocalizadas el radiotelescopio ROSAC, así como de estaciones de la red SIRGAS-CON, con el propósito de caracterizar las variaciones del contenido electrónico de la ionosfera y su posible relación con la actividad solar.',
      },
      {
        src: '/images/Researchers/IvanniaCalvo.png',
        name: 'MSc. Ivania Calvo',
        role: 'Investigadora colaboradora',
        email: 'ivannia.calvo@ucr.ac.cr',
        institution: 'Centro de Investigaciones Espaciales',
        description:
          'Soporte Técnico/Computacional y encargada del Observatorio Astronómico de San José (OAS)',
      },
      {
        src: '/images/Researchers/MolinaMariaGraciela.jpg',
        name: 'Dra. Graciela Molina',
        role: 'Investigadora colaboradora',
        email: 'gmolina@herrera.unt.edu.ar',
        institution:
          'Facultad de Ciencias Exactas y Tecnología (FACET, UNT), Argentina; Istituto Nazionale di Geofisica e Vulcanologia (INGV), Italia',
        description:
          'Su contribución se centra en el análisis y modelado de grandes volúmenes de datos mediante aprendizaje automático, series temporales y computación de alto desempeño, con especial énfasis en el monitoreo y la predicción del estado de la ionosfera ante diferentes condiciones solares y geomagnéticas. Asimismo, aporta su experiencia en instrumentación ionosférica y en el desarrollo de software para la detección automática de señales de radares geofísicos, fortaleciendo la integración entre observaciones, procesamiento avanzado de datos y herramientas predictivas dentro del laboratorio.',
      },
      {
        src: '/images/Researchers/YencaMigoya.jpg',
        name: 'Dra. Yenca Migoya',
        role: 'Investigadora colaboradora',
        email: 'yenca@ictp.it',
        institution:
          'Science, Technology and Innovation Unit, The Abdus Salam International Centre for Theoretical Physics (ICTP), Italia',
        description:
          'Su contribución comprende el desarrollo e implementación de modelos físicos y computacionales, incluyendo técnicas de aprendizaje automático para analizar, interpretar, predecir y clasificar fenómenos espaciales. Asimismo, participa en el procesamiento y estudio de datos observacionales y simulaciones, fortaleciendo la capacidad del laboratorio para transformar grandes volúmenes de información en conocimiento científico. Su experiencia contribuye además a la consolidación del LASCE como un espacio de investigación interdisciplinaria y cooperación científica con proyección latinoamericana.',
      },
      {
        src: '/images/Researchers/JohanaCamacho.jpeg',
        name: 'MSc. Johanna Pamela Camacho Garbanzo',
        role: 'Investigadora colaboradora',
        email: ['jcamachoga@ice.go.cr', 'Johanna.camacho@ucr.ac.cr'],
        institution: 'Instituto Costarricense de Electricidad; Universidad de Costa Rica',
        description:
          'Es geofísica de exploración del Instituto Costarricense de Electricidad (ICE), donde cuenta con más de 17 años de experiencia en la aplicación de métodos geofísicos para la caracterización del subsuelo y el desarrollo de proyectos de investigación aplicada. Asimismo, posee 8 años de experiencia como docente universitaria en la Escuela de Física de la Universidad de Costa Rica, impartiendo laboratorios de Física General. Actualmente es estudiante de doctorado e investigadora del Laboratorio de Clima Espacial (LASCE), donde desarrolla investigaciones relacionadas con geomagnetismo, ionósfera y clima espacial, utilizando registros de campo magnético terrestre en tiempo real. Su trabajo se enfoca en el análisis de la interacción entre la actividad geomagnética y la ionósfera, así como en sus aplicaciones para el estudio del clima espacial en Costa Rica. A lo largo de su trayectoria profesional ha participado en numerosos estudios e informes de investigación geofísica aplicados a infraestructura, exploración del subsuelo, energía e ingeniería, mediante el uso de técnicas como radar de penetración terrestre (GPR), tomografía de resistividad eléctrica y otros métodos geofísicos. Sus principales áreas de interés incluyen la geofísica aplicada, el geomagnetismo, el clima espacial y la formación de nuevas generaciones de científicos e Ingenieros.',
      },
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
