import { prisma } from '@lasce/db'
import type { NosotrosActivityIcon, Prisma } from '@lasce/db'

import es from '@/messages/es.json' with { type: 'json' }

import { runWrite, WriteAbort } from '@/app/lib/cms/transaction'
import { isCurrentVersion, nextUpdatedAt, parseVersion, toVersion } from '@/app/lib/cms/version'
import { defaultLocale, type Locale } from '@/app/lib/i18n/config'
import {
  translationLocales,
  type ReviewConfirmation as ContentReviewConfirmation,
} from '@/app/lib/i18n/content/definition'
import {
  baseContent,
  resolveContent,
  storedContentFrom,
  translationRows,
} from '@/app/lib/i18n/content/resolve'
import { findPendingReviews } from '@/app/lib/i18n/content/review'

import {
  nosotrosActivityContent,
  type NosotrosActivityCreateInput,
  type NosotrosActivityEditingData,
  type NosotrosActivityField,
  type NosotrosActivityUpdateInput,
  type NosotrosCardIcon,
} from './nosotros-activity-schema'
import {
  nosotrosResearcherContent,
  type NosotrosResearcherCreateInput,
  type NosotrosResearcherEditingData,
  type NosotrosResearcherField,
  type NosotrosResearcherUpdateInput,
} from './nosotros-researcher-schema'

export * from './nosotros-activity-schema'
export * from './nosotros-researcher-schema'

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
 * The fixed text lives in the `nosotros` namespace of `apps/web/messages/`; `getNosotrosContent`
 * builds the page from it. The people and activity cards below are Spanish stand-ins for
 * database rows, so they are not translated.
 *
 * `researchers.people` is persisted in Postgres (LASCE-CON-012-086 follow-up) and fetched by
 * `getNosotrosResearchers()`; the fixtures below are only a fallback for Storybook
 * and tests, never what the real `/nosotros` route renders. Portraits are the named files in
 * `public/images/Researchers/`, except Dra. Carolina Salas Matamoros, who reuses the ROSAC
 * portrait, or a MinIO URL once uploaded through the admin form. People without a supplied
 * portrait use `User.png`. This is a separate, independently curated roster from the ROSAC team on
 * `/radioastronomia` — see `app/lib/rosac.ts` — not the same people re-shown here.
 */
interface NosotrosTextSection {
  title: string
  paragraphs: readonly string[]
}

export interface NosotrosResearcher {
  id: string
  /** Local path under `apps/web/public`, or a MinIO URL once uploaded through the admin form. */
  src: string
  name: string
  /** The category shown at the top of the card, for example `Investigador`. */
  role: string
  /** Public address, or up to two, when LASCE supplied them. */
  email?: string | readonly string[]
  /** Affiliation shown as `Institución: {institution}`. */
  institution: string
  description?: string
  /**
   * The language `role` and `description` are actually in. `null` when the researcher is legacy
   * and its base text is shown, because that text's language is unknown. Set by
   * `getNosotrosResearchers`; absent on fixtures, which sets no `lang`.
   */
  contentLocale?: Locale | null
  /** Present only when loaded with `includeEditingData`. */
  editing?: NosotrosResearcherEditingData
}

/** One "¿Qué hacemos?" card, in the language it is shown in. */
export interface NosotrosActivityItem {
  id: string
  icon: NosotrosCardIcon
  title: string
  description: string
  /**
   * The language `title` and `description` are actually in. `null` when the card is legacy and
   * its base text is shown, because that text's language is unknown. Set by
   * `getNosotrosActivities`; absent on fixtures, which sets no `lang`.
   */
  contentLocale?: Locale | null
  /** Present only when loaded with `includeEditingData`. */
  editing?: NosotrosActivityEditingData
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
    items: readonly NosotrosActivityItem[]
  }
  contribution: NosotrosTextSection
  vision: NosotrosTextSection
  backLink: { href: string; label: string }
}

/** The parts of a message catalogue the Nosotros page reads. */
export type NosotrosMessages = Pick<typeof es, 'nosotros' | 'common'>

/**
 * The page in the language of `messages`. The route passes the request's catalogue and then
 * fills `researchers.people` and `activities.items` from the database.
 */
export function getNosotrosContent({ nosotros, common }: NosotrosMessages): NosotrosContent {
  return {
    hero: nosotros.hero,
    overview: {
      title: nosotros.overview.title,
      paragraphs: [nosotros.overview.p1, nosotros.overview.p2],
    },
    researchers: {
      title: nosotros.researchers.title,
      intro: nosotros.researchers.intro,
      hint: nosotros.researchers.hint,
      emptyMessage: nosotros.researchers.empty,
      people: [],
    },
    activities: { title: nosotros.activities.title, items: [] },
    contribution: {
      title: nosotros.contribution.title,
      paragraphs: [nosotros.contribution.p1],
    },
    vision: { title: nosotros.vision.title, paragraphs: [nosotros.vision.p1] },
    backLink: { href: '/', label: common.backToHome },
  }
}

/** The Spanish text of the fixture researchers, before their editing data is added. */
const spanishResearcherFixtures: readonly NosotrosResearcher[] = [
  {
    id: 'carolina-salas',
    src: '/images/ROSAC/team/CarolinaSalas.jpg',
    name: 'Dra. Carolina Salas Matamoros',
    role: 'Investigadora principal',
    email: 'carolina.salas_mata@ucr.ac.cr',
    institution: 'Centro de Investigaciones Espaciales, CINESPA',
    description:
      'Además de desempeñarse como investigadora principal, orienta la definición de las líneas de investigación, coordina la integración entre astrofísica solar, radioastronomía, clima espacial, análisis de datos e inteligencia artificial; y vincula el trabajo científico con el desarrollo de infraestructura y capacidades de observación propias, particularmente mediante el radiotelescopio ROSAC. Su experiencia en el estudio conjunto de flares, emisiones de rayos X, eyecciones de masa coronal y predicción de tiempos de llegada de ICMEs a la Tierra, proporciona la base científica para impulsar herramientas de monitoreo y pronóstico adaptadas a Costa Rica. Asimismo, promueve la colaboración interdisciplinaria e internacional, la formación de estudiantes y jóvenes investigadores, y la transferencia del conocimiento científico hacia aplicaciones que permitan comprender y anticipar los efectos de la actividad solar sobre el entorno terrestre y los sistemas tecnológicos.',
  },
  {
    id: 'allan-berrocal',
    src: '/images/Researchers/AllanBerrocal.jpg',
    name: 'Dr. Allan Francisco Berrocal Rojas',
    role: 'Investigador colaborador',
    email: 'allan.berrocal@ucr.ac.cr',
    institution: 'Escuela de Ciencias de la Computación e Informática, UCR',
    description:
      'Diseño, desarrollo e implementación de la plataforma informática del LASCE. Las tareas puntuales abarcan la captura de datos masivos de diferentes fuentes con información sobre el clima solar, el almacenamiento de los datos procesados y de interés para el proyecto en sistemas de bases de datos adecuadas para el dominio, y finalmente la habilitación de una interfaz de consulta mediante servicios web. Adicionalmente apoyar en los objetivos de análisis de datos sobre el clima solar junto a investigadores(as) especialistas en la materia como astrofísicos(as) solares.',
  },
  {
    id: 'luis-esquivel',
    src: '/images/Researchers/LuisEsquivel.jpeg',
    name: 'Dr. Luis Gustavo Esquivel Quirós',
    role: 'Investigador colaborador',
    email: 'luis.esquivel@ucr.ac.cr',
    institution: 'Escuela de Ciencias de la Computación e Informática, UCR',
  },
  {
    id: 'ivannia-calvo',
    src: '/images/Researchers/IvanniaCalvo.png',
    name: 'MSc. Ivannia Calvo',
    role: 'Investigadora colaboradora',
    email: 'ivannia.calvo@ucr.ac.cr',
    institution: 'Centro de Investigaciones Espaciales',
    description:
      'Soporte Técnico/Computacional y encargada del Observatorio Astronómico de San José (OAS)',
  },
  {
    id: 'felipe-meza',
    src: '/images/Researchers/FelipeMeza.jpg',
    name: 'Dr. Felipe Meza Obando',
    role: 'Investigador colaborador',
    email: 'felipe.mezaobando@ucr.ac.cr',
    institution:
      'Escuela de Ingeniería Mecatrónica, TEC; Laboratorio de Inteligencia Artificial para las Ciencias Naturales (LIANA), TEC; Centro de Investigaciones Espaciales, UCR',
    description:
      'Desarrollo de modelos inteligentes para el análisis, interpretación y predicción de señales asociadas a fenómenos de clima espacial, integrando inteligencia artificial, procesamiento de señales y radioastronomía solar.',
  },
  {
    id: 'alonso-vega',
    src: '/images/Researchers/User.png',
    name: 'MSc. Alonso Vega',
    role: 'Investigador colaborador',
    email: 'alonso.vega_f@ucr.ac.cr',
    institution: 'Escuela de Ingeniería Topográfica, UCR',
    description:
      'Procesamiento y análisis de datos GNSS provenientes de estaciones de operación continua colocalizadas el radiotelescopio ROSAC, así como de estaciones de la red SIRGAS-CON, con el propósito de caracterizar las variaciones del contenido electrónico de la ionosfera y su posible relación con la actividad solar.',
  },
  {
    id: 'gabriela-molina',
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
    id: 'yenca-migoya',
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
    id: 'johanna-camacho',
    src: '/images/Researchers/JohanaCamacho.jpeg',
    name: 'MSc. Johanna Pamela Camacho Garbanzo',
    role: 'Investigadora colaboradora',
    email: ['jcamachoga@ice.go.cr', 'Johanna.camacho@ucr.ac.cr'],
    institution: 'Instituto Costarricense de Electricidad; Universidad de Costa Rica',
    description:
      'Es geofísica de exploración del Instituto Costarricense de Electricidad (ICE), donde cuenta con más de 17 años de experiencia en la aplicación de métodos geofísicos para la caracterización del subsuelo y el desarrollo de proyectos de investigación aplicada. Asimismo, posee 8 años de experiencia como docente universitaria en la Escuela de Física de la Universidad de Costa Rica, impartiendo laboratorios de Física General. Actualmente es estudiante de doctorado e investigadora del Laboratorio de Clima Espacial (LASCE), donde desarrolla investigaciones relacionadas con geomagnetismo, ionósfera y clima espacial, utilizando registros de campo magnético terrestre en tiempo real. Su trabajo se enfoca en el análisis de la interacción entre la actividad geomagnética y la ionósfera, así como en sus aplicaciones para el estudio del clima espacial en Costa Rica. A lo largo de su trayectoria profesional ha participado en numerosos estudios e informes de investigación geofísica aplicados a infraestructura, exploración del subsuelo, energía e ingeniería, mediante el uso de técnicas como radar de penetración terrestre (GPR), tomografía de resistividad eléctrica y otros métodos geofísicos. Sus principales áreas de interés incluyen la geofísica aplicada, el geomagnetismo, el clima espacial y la formación de nuevas generaciones de científicos e Ingenieros.',
  },
]

type ResearcherFixtureText = { role: string; description: string | null }

/** The English role and description of each fixture researcher, keyed by id. */
const englishResearcherText: Record<string, ResearcherFixtureText> = {
  'carolina-salas': {
    role: 'Principal investigator',
    description:
      'Besides serving as principal investigator, she guides the definition of the research lines and coordinates the integration of solar astrophysics, radio astronomy, space weather, data analysis and artificial intelligence; she also links the scientific work to the development of infrastructure and our own observation capabilities, particularly through the ROSAC radio telescope. Her experience in the joint study of flares, X-ray emissions, coronal mass ejections and the prediction of ICME arrival times at Earth provides the scientific basis to drive monitoring and forecasting tools adapted to Costa Rica. She also promotes interdisciplinary and international collaboration, the training of students and young researchers, and the transfer of scientific knowledge into applications that help understand and anticipate the effects of solar activity on the terrestrial environment and technological systems.',
  },
  'allan-berrocal': {
    role: 'Collaborating researcher',
    description:
      "Design, development and implementation of LASCE's computing platform. The specific tasks cover capturing massive data from different sources with space weather information, storing the processed data of interest to the project in database systems suited to the domain, and finally providing a query interface through web services. He also supports the data analysis objectives on space weather alongside specialist researchers such as solar astrophysicists.",
  },
  'luis-esquivel': { role: 'Collaborating researcher', description: null },
  'ivannia-calvo': {
    role: 'Collaborating researcher',
    description:
      'Technical and computing support, and in charge of the San José Astronomical Observatory (OAS).',
  },
  'felipe-meza': {
    role: 'Collaborating researcher',
    description:
      'Development of intelligent models for the analysis, interpretation and prediction of signals associated with space weather phenomena, integrating artificial intelligence, signal processing and solar radio astronomy.',
  },
  'alonso-vega': {
    role: 'Collaborating researcher',
    description:
      'Processing and analysis of GNSS data from continuously operating stations co-located with the ROSAC radio telescope, as well as stations of the SIRGAS-CON network, to characterize variations in the ionospheric electron content and their possible relation to solar activity.',
  },
  'gabriela-molina': {
    role: 'Collaborating researcher',
    description:
      'Her contribution focuses on the analysis and modeling of large volumes of data through machine learning, time series and high-performance computing, with special emphasis on monitoring and predicting the state of the ionosphere under different solar and geomagnetic conditions. She also contributes her experience in ionospheric instrumentation and in developing software for the automatic detection of signals from geophysical radars, strengthening the integration of observations, advanced data processing and predictive tools within the laboratory.',
  },
  'yenca-migoya': {
    role: 'Collaborating researcher',
    description:
      "Her contribution includes the development and implementation of physical and computational models, including machine learning techniques, to analyze, interpret, predict and classify space phenomena. She also takes part in processing and studying observational data and simulations, strengthening the laboratory's capacity to turn large volumes of information into scientific knowledge. Her experience also contributes to consolidating LASCE as a space for interdisciplinary research and scientific cooperation with a Latin American reach.",
  },
  'johanna-camacho': {
    role: 'Collaborating researcher',
    description:
      'She is an exploration geophysicist at the Costa Rican Electricity Institute (ICE), with more than 17 years of experience applying geophysical methods to characterize the subsurface and to develop applied research projects. She also has 8 years of experience as a university lecturer at the School of Physics of the University of Costa Rica, teaching General Physics laboratories. She is currently a doctoral student and researcher at the Space Weather Laboratory (LASCE), where she carries out research on geomagnetism, the ionosphere and space weather using real-time records of the Earth\'s magnetic field. Her work focuses on analyzing the interaction between geomagnetic activity and the ionosphere, and on its applications to the study of space weather in Costa Rica. Throughout her career she has taken part in numerous geophysical research studies and reports applied to infrastructure, subsurface exploration, energy and engineering, using techniques such as ground-penetrating radar (GPR), electrical resistivity tomography and other geophysical methods. Her main areas of interest include applied geophysics, geomagnetism, space weather and the training of new generations of scientists and engineers.',
  },
}

/**
 * A fixture researcher shown in Spanish, with both languages in its editing data as a complete
 * researcher has them. The editing data is only read by the editor, so a visitor's page ignores
 * it.
 */
function fixtureResearcher(person: NosotrosResearcher): NosotrosResearcher {
  const en = englishResearcherText[person.id]
  const es: ResearcherFixtureText = {
    role: person.role,
    description: person.description ?? null,
  }
  return {
    ...person,
    contentLocale: 'es',
    editing: { content: { es, en }, isLegacy: false, version: '2026-10-15T15:00:00.000Z' },
  }
}

/** Spanish stand-ins for the `nosotros_researchers` rows, for Storybook and tests. */
export const nosotrosResearcherFixtures: readonly NosotrosResearcher[] =
  spanishResearcherFixtures.map(fixtureResearcher)

type FixtureText = { title: string; description: string }

/**
 * A fixture card shown in Spanish, with both languages in its editing data as a complete card
 * has them. The editing data is only read by the editor, so a visitor's page ignores it.
 */
function fixtureActivity(
  id: string,
  icon: NosotrosCardIcon,
  es: FixtureText,
  en: FixtureText,
): NosotrosActivityItem {
  return {
    id,
    icon,
    ...es,
    contentLocale: 'es',
    editing: { content: { es, en }, isLegacy: false, version: '2026-09-17T15:00:00.000Z' },
  }
}

/** Spanish stand-ins for the `nosotros_activities` rows, for Storybook and tests. */
export const nosotrosActivityFixtures: NosotrosContent['activities']['items'] = [
  fixtureActivity(
    'eruptive-phenomena',
    'sun',
    {
      title: 'Fenómenos solares eruptivos',
      description:
        "Analizamos fenómenos solares eruptivos, como 'flares', eyecciones de masa coronal (CMEs, por sus siglas en inglés) y emisiones solares de radio.",
    },
    {
      title: 'Eruptive solar phenomena',
      description:
        'We analyze eruptive solar phenomena, such as flares, coronal mass ejections (CMEs) and solar radio emissions.',
    },
  ),
  fixtureActivity(
    'solar-terrestrial',
    'waves',
    {
      title: 'Perturbaciones y relación Sol-Tierra',
      description:
        'Estudiamos la evolución de perturbaciones solares y su relación con el viento solar, el campo magnético interplanetario y local, y la ionosfera.',
    },
    {
      title: 'Disturbances and the Sun-Earth relationship',
      description:
        'We study the evolution of solar disturbances and their relationship with the solar wind, the interplanetary and local magnetic field, and the ionosphere.',
    },
  ),
  fixtureActivity(
    'observations',
    'satellite',
    {
      title: 'Integración de observaciones',
      description:
        'Integramos mediciones propias con imágenes y datos de satélites, estaciones terrestres y observatorios internacionales.',
    },
    {
      title: 'Integration of observations',
      description:
        'We integrate our own measurements with images and data from satellites, ground stations and international observatories.',
    },
  ),
  fixtureActivity(
    'computational-tools',
    'code',
    {
      title: 'Herramientas computacionales',
      description:
        'Implementamos y desarrollamos herramientas computacionales para procesar datos, reconocer patrones y apoyar a la investigación en la predicción del clima espacial y su impacto en nuestro país.',
    },
    {
      title: 'Computational tools',
      description:
        'We implement and develop computational tools to process data, recognize patterns and support research on space weather prediction and its impact on our country.',
    },
  ),
  fixtureActivity(
    'collaboration',
    'collaboration',
    {
      title: 'Colaboración interdisciplinaria',
      description:
        'Promovemos proyectos interdisciplinarios y colaboraciones nacionales e internacionales.',
    },
    {
      title: 'Interdisciplinary collaboration',
      description:
        'We promote interdisciplinary projects and national and international collaborations.',
    },
  ),
  fixtureActivity(
    'training',
    'education',
    {
      title: 'Formación de estudiantes',
      description:
        'Creamos oportunidades de formación práctica para estudiantes mediante investigación, instrumentación, programación y análisis de datos.',
    },
    {
      title: 'Student training',
      description:
        'We create hands-on training opportunities for students through research, instrumentation, programming and data analysis.',
    },
  ),
]

/** The page in Spanish with the database stand-ins filled in. For stories and tests. */
export const nosotrosContent: NosotrosContent = (() => {
  const content = getNosotrosContent(es)
  return {
    ...content,
    researchers: { ...content.researchers, people: nosotrosResearcherFixtures },
    activities: { ...content.activities, items: nosotrosActivityFixtures },
  }
})()

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

export interface NosotrosActivityRecord extends NosotrosActivityItem {
  modifiedAt: string
}

export type NosotrosActivityWriteFailure =
  | { ok: false; reason: 'not-found' }
  /** The card changed since the editor loaded it. */
  | { ok: false; reason: 'conflict' }
  /** Fields changed in one language whose counterpart was neither changed nor confirmed. */
  | {
      ok: false
      reason: 'review-required'
      pending: ContentReviewConfirmation<NosotrosActivityField>[]
    }

export type NosotrosActivityWriteResult =
  { ok: true; activity: NosotrosActivityRecord } | NosotrosActivityWriteFailure

const activityInclude = {
  translations: {
    where: { locale: { in: [...translationLocales] } },
    select: { locale: true, title: true, paragraph: true },
  },
} satisfies Prisma.NosotrosActivityInclude

type NosotrosActivityRow = Prisma.NosotrosActivityGetPayload<{ include: typeof activityInclude }>

type ActivityText = { title: string; paragraph: string }

/**
 * A card's text in every language, from its base row and its translation rows. The content
 * definition calls the text `description`; both kinds of row store it as `paragraph`.
 */
function storedContentOf(
  base: ActivityText,
  translations: readonly (ActivityText & { locale: string })[],
) {
  return storedContentFrom(
    nosotrosActivityContent,
    { title: base.title, description: base.paragraph },
    translations.map(({ locale, title, paragraph }) => ({
      locale,
      title,
      description: paragraph,
    })),
  )
}

function toActivityRecord(
  row: NosotrosActivityRow,
  locale: Locale,
  includeEditingData: boolean,
): NosotrosActivityRecord {
  const content = storedContentOf(row, row.translations)
  // A complete card's base text was written or confirmed as Spanish when it was saved. A legacy
  // card's base text was entered before languages existed, so its language is unknown.
  const { content: shown, contentLocale, isLegacy } = resolveContent(content, locale)

  return {
    id: row.id,
    icon: ICON_FROM_DB[row.icon],
    title: shown.title,
    description: shown.description,
    modifiedAt: row.modifiedAt.toISOString(),
    contentLocale,
    ...(includeEditingData
      ? { editing: { content, isLegacy, version: toVersion(row.modifiedAt) } }
      : {}),
  }
}

/** The base row's columns for a content input: `description` is stored as `paragraph`. */
function baseColumns(content: NosotrosActivityCreateInput['content']) {
  const { title, description } = baseContent(nosotrosActivityContent, content)
  return { title, paragraph: description }
}

/** One translation row per other language, with `description` stored as `paragraph`. */
function translationColumns(content: NosotrosActivityCreateInput['content']) {
  return translationRows(nosotrosActivityContent, content).map(
    ({ locale, title, description }) => ({ locale, title, paragraph: description }),
  )
}

/**
 * Loads the activity flashcards from Postgres, in display order. Ordered by
 * `createdAt` rather than `modifiedAt` on purpose — editing a card's text
 * updates `modifiedAt` too, and that must not also move the card.
 *
 * `title` and `description` are in `locale` when the card has that translation, and fall back to
 * the base text otherwise; `contentLocale` says which one was used. Pass `includeEditingData`
 * only for someone who can edit, because it sends every language to the browser.
 */
export async function getNosotrosActivities(
  locale: Locale = defaultLocale,
  { includeEditingData = false }: { includeEditingData?: boolean } = {},
): Promise<NosotrosActivityRecord[]> {
  const rows = await prisma.nosotrosActivity.findMany({
    orderBy: { createdAt: 'asc' },
    include: activityInclude,
  })
  return rows.map((row) => toActivityRecord(row, locale, includeEditingData))
}

/**
 * Runs a write transaction (`runWrite`) and reports the stored card. Expected failures are
 * raised as `WriteAbort`, so the transaction rolls back before anything is reported.
 */
async function writeActivity(
  write: (tx: Prisma.TransactionClient) => Promise<NosotrosActivityRow>,
): Promise<NosotrosActivityWriteResult> {
  const result = await runWrite<NosotrosActivityRow, NosotrosActivityWriteFailure>(write)
  return result.ok
    ? { ok: true, activity: toActivityRecord(result.value, defaultLocale, true) }
    : result
}

/**
 * Creates a new activity flashcard in every language at once, authored by the admin who
 * submitted it. `createdAt` defaults to now, which — since the list is ordered by it — puts the
 * new card at the end, same place `AddItemCard` prompted from. A create has no expected failure.
 */
export async function createNosotrosActivity(
  input: NosotrosActivityCreateInput,
  modifiedBy: string,
): Promise<NosotrosActivityRecord> {
  const result = await runWrite<NosotrosActivityRow, never>((tx) =>
    tx.nosotrosActivity.create({
      data: {
        icon: ICON_TO_DB[input.icon],
        ...baseColumns(input.content),
        modifiedBy,
        translations: { create: translationColumns(input.content) },
      },
      include: activityInclude,
    }),
  )

  return toActivityRecord(result.value, defaultLocale, true)
}

/**
 * Updates the fields present in `input` and stamps `modifiedBy` with the admin who made the
 * change, all at once: either everything is stored or nothing is.
 *
 * With `content` it is a bilingual content update: both languages are written, after checking
 * that every one-sided change has its counterpart changed or confirmed (`findPendingReviews`).
 * Without `content` it updates the icon only, and titles, descriptions and translations are left
 * exactly as they are, so a legacy card can be corrected without being translated first.
 *
 * Optimistic concurrency applies to both kinds: `input.version` is the `modified_at` the editor
 * loaded. The base row is updated only while it still has that value, and every save moves it
 * forward, so of two editors who loaded the same version the second one gets `conflict` instead
 * of silently overwriting the first.
 */
export async function updateNosotrosActivity(
  id: string,
  input: NosotrosActivityUpdateInput,
  modifiedBy: string,
): Promise<NosotrosActivityWriteResult> {
  const expectedModifiedAt = parseVersion(input.version)

  return writeActivity(async (tx) => {
    const current = await tx.nosotrosActivity.findUnique({
      where: { id },
      select: {
        title: true,
        paragraph: true,
        modifiedAt: true,
        translations: activityInclude.translations,
      },
    })

    if (!current) {
      throw new WriteAbort<NosotrosActivityWriteFailure>({ ok: false, reason: 'not-found' })
    }

    if (!isCurrentVersion(current.modifiedAt, expectedModifiedAt)) {
      throw new WriteAbort<NosotrosActivityWriteFailure>({ ok: false, reason: 'conflict' })
    }

    const { content } = input

    if (content) {
      const pending = findPendingReviews(
        nosotrosActivityContent,
        storedContentOf(current, current.translations),
        content,
        input.confirmedUnchanged ?? [],
      )

      if (pending.length > 0) {
        throw new WriteAbort<NosotrosActivityWriteFailure>({
          ok: false,
          reason: 'review-required',
          pending,
        })
      }
    }

    const { count } = await tx.nosotrosActivity.updateMany({
      where: { id, modifiedAt: expectedModifiedAt },
      data: {
        ...(content ? baseColumns(content) : {}),
        ...(input.icon === undefined ? {} : { icon: ICON_TO_DB[input.icon] }),
        modifiedBy,
        // Strictly later than the version it replaces, even if two saves share a millisecond.
        modifiedAt: nextUpdatedAt(expectedModifiedAt),
      },
    })

    if (count === 0) {
      throw new WriteAbort<NosotrosActivityWriteFailure>({ ok: false, reason: 'conflict' })
    }

    if (content) {
      for (const { locale, ...text } of translationColumns(content)) {
        await tx.nosotrosActivityTranslation.upsert({
          where: { activityId_locale: { activityId: id, locale } },
          create: { activityId: id, locale, ...text },
          update: text,
        })
      }
    }

    return tx.nosotrosActivity.findUniqueOrThrow({ where: { id }, include: activityInclude })
  })
}

/** Deletes one activity flashcard. Its translations go with it (`ON DELETE CASCADE`). */
export async function deleteNosotrosActivity(id: string): Promise<boolean> {
  // One statement that reports how many rows it removed: a concurrent delete of the same card
  // finds nothing and answers "not found", instead of failing between a check and the delete.
  const { count } = await prisma.nosotrosActivity.deleteMany({ where: { id } })
  return count > 0
}

/**
 * The `nosotros_researchers` roster shown on `/nosotros` (LASCE-CON-012-086
 * follow-up), independent from `researchers` (the ROSAC team on
 * `/radioastronomia` — see `app/lib/rosac.ts`). Rows map directly onto
 * `NosotrosResearcher`, the same shape `TeamGallery`/`ResearcherCard` expect,
 * so `getNosotrosResearchers()` drops straight into `TeamGallery`.
 *
 * Only `role` and `description` are bilingual; the base row holds the Spanish text and
 * `nosotros_researcher_translations` every other language.
 */
export type NosotrosResearcherWriteFailure =
  | { ok: false; reason: 'not-found' }
  /** The researcher changed since the editor loaded it. */
  | { ok: false; reason: 'conflict' }
  /** Fields changed in one language whose counterpart was neither changed nor confirmed. */
  | {
      ok: false
      reason: 'review-required'
      pending: ContentReviewConfirmation<NosotrosResearcherField>[]
    }

export type NosotrosResearcherWriteResult =
  { ok: true; researcher: NosotrosResearcher } | NosotrosResearcherWriteFailure

const researcherInclude = {
  translations: {
    where: { locale: { in: [...translationLocales] } },
    select: { locale: true, role: true, description: true },
  },
} satisfies Prisma.NosotrosResearcherInclude

type NosotrosResearcherRow = Prisma.NosotrosResearcherGetPayload<{
  include: typeof researcherInclude
}>

function toNosotrosResearcher(
  row: NosotrosResearcherRow,
  locale: Locale,
  includeEditingData: boolean,
): NosotrosResearcher {
  const content = storedContentFrom(nosotrosResearcherContent, row, row.translations)
  // A complete researcher's base text was written or confirmed as Spanish when it was saved. A
  // legacy researcher's base text was entered before languages existed, so its language is unknown.
  const { content: shown, contentLocale, isLegacy } = resolveContent(content, locale)

  return {
    id: row.id,
    src: row.photoUrl,
    role: shown.role,
    name: row.name,
    institution: row.institution,
    email: row.email.length > 0 ? row.email : undefined,
    description: shown.description ?? undefined,
    contentLocale,
    ...(includeEditingData
      ? { editing: { content, isLegacy, version: toVersion(row.modifiedAt) } }
      : {}),
  }
}

/**
 * Loads the researcher roster from Postgres, in display order (creation order).
 *
 * `role` and `description` are in `locale` when the researcher has that translation, and fall
 * back to the base text otherwise; `contentLocale` says which one was used. Pass
 * `includeEditingData` only for someone who can edit, because it sends every language to the
 * browser.
 */
export async function getNosotrosResearchers(
  locale: Locale = defaultLocale,
  { includeEditingData = false }: { includeEditingData?: boolean } = {},
): Promise<NosotrosResearcher[]> {
  const rows = await prisma.nosotrosResearcher.findMany({
    orderBy: { createdAt: 'asc' },
    include: researcherInclude,
  })
  return rows.map((row) => toNosotrosResearcher(row, locale, includeEditingData))
}

/**
 * Creates a new Nosotros researcher profile in every language at once, authored by the admin
 * who submitted it. `createdAt` defaults to now, which — since the list is ordered by it — puts
 * the new profile at the end, same place `AddItemCard` prompted from. A create has no expected
 * failure.
 */
export async function createNosotrosResearcher(
  input: NosotrosResearcherCreateInput,
  modifiedBy: string,
): Promise<NosotrosResearcher> {
  const result = await runWrite<NosotrosResearcherRow, never>((tx) =>
    tx.nosotrosResearcher.create({
      data: {
        photoUrl: input.src,
        name: input.name,
        email: input.email ?? [],
        institution: input.institution,
        ...baseContent(nosotrosResearcherContent, input.content),
        modifiedBy,
        translations: { create: translationRows(nosotrosResearcherContent, input.content) },
      },
      include: researcherInclude,
    }),
  )

  return toNosotrosResearcher(result.value, defaultLocale, true)
}

/**
 * Updates the fields present in `input` and stamps `modifiedBy` with the admin who made the
 * change, all at once: either everything is stored or nothing is.
 *
 * With `content` it is a bilingual content update: both languages are written, after checking
 * that every one-sided change has its counterpart changed or confirmed (`findPendingReviews`).
 * Without `content` it updates the shared fields only, and roles, descriptions and translations
 * are left exactly as they are, so a legacy researcher can be corrected without being translated
 * first.
 *
 * Optimistic concurrency applies to both kinds: `input.version` is the `modified_at` the editor
 * loaded. The base row is updated only while it still has that value, and every save moves it
 * forward, so of two editors who loaded the same version the second one gets `conflict` instead
 * of silently overwriting the first.
 */
export async function updateNosotrosResearcher(
  id: string,
  input: NosotrosResearcherUpdateInput,
  modifiedBy: string,
): Promise<NosotrosResearcherWriteResult> {
  const expectedModifiedAt = parseVersion(input.version)

  const result = await runWrite<NosotrosResearcherRow, NosotrosResearcherWriteFailure>(
    async (tx) => {
      const current = await tx.nosotrosResearcher.findUnique({
        where: { id },
        select: {
          role: true,
          description: true,
          modifiedAt: true,
          translations: researcherInclude.translations,
        },
      })

      if (!current) {
        throw new WriteAbort<NosotrosResearcherWriteFailure>({ ok: false, reason: 'not-found' })
      }

      if (!isCurrentVersion(current.modifiedAt, expectedModifiedAt)) {
        throw new WriteAbort<NosotrosResearcherWriteFailure>({ ok: false, reason: 'conflict' })
      }

      const { content } = input

      if (content) {
        const pending = findPendingReviews(
          nosotrosResearcherContent,
          storedContentFrom(nosotrosResearcherContent, current, current.translations),
          content,
          input.confirmedUnchanged ?? [],
        )

        if (pending.length > 0) {
          throw new WriteAbort<NosotrosResearcherWriteFailure>({
            ok: false,
            reason: 'review-required',
            pending,
          })
        }
      }

      const { count } = await tx.nosotrosResearcher.updateMany({
        where: { id, modifiedAt: expectedModifiedAt },
        data: {
          ...(content ? baseContent(nosotrosResearcherContent, content) : {}),
          ...(input.src === undefined ? {} : { photoUrl: input.src }),
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.email === undefined ? {} : { email: input.email }),
          ...(input.institution === undefined ? {} : { institution: input.institution }),
          modifiedBy,
          // Strictly later than the version it replaces, even if two saves share a millisecond.
          modifiedAt: nextUpdatedAt(expectedModifiedAt),
        },
      })

      if (count === 0) {
        throw new WriteAbort<NosotrosResearcherWriteFailure>({ ok: false, reason: 'conflict' })
      }

      if (content) {
        for (const { locale, ...text } of translationRows(nosotrosResearcherContent, content)) {
          await tx.nosotrosResearcherTranslation.upsert({
            where: { researcherId_locale: { researcherId: id, locale } },
            create: { researcherId: id, locale, ...text },
            update: text,
          })
        }
      }

      return tx.nosotrosResearcher.findUniqueOrThrow({
        where: { id },
        include: researcherInclude,
      })
    },
  )

  return result.ok
    ? { ok: true, researcher: toNosotrosResearcher(result.value, defaultLocale, true) }
    : result
}

/** Deletes one researcher profile. Its translations go with it (`ON DELETE CASCADE`). */
export async function deleteNosotrosResearcher(id: string): Promise<boolean> {
  // One statement that reports how many rows it removed: a concurrent delete of the same profile
  // finds nothing and answers "not found", instead of failing between a check and the delete.
  const { count } = await prisma.nosotrosResearcher.deleteMany({ where: { id } })
  return count > 0
}
