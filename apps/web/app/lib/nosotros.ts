/**
 * Editorial source: PROVISIONAL copy pending LASCE approval (LASCE-PUB-001-002).
 * Institutional overview and purpose only. Work areas, solar astrophysics and space weather
 * each have their own page, so keep this module to what the laboratory is and what it is for.
 *
 * Two expansions of the LASCE acronym are in use across the site: "Laboratorio de Ciencias
 * Espaciales" and "Laboratorio de Astrofísica Solar y Clima Espacial". This module uses the
 * second, which matches the acronym. LASCE should settle which one is official.
 *
 * Delete the `flag` key once the copy is approved; the banner disappears on its own.
 *
 * `team.people[].src` must be a local path under `apps/web/public`. `next.config.ts` declares
 * no `images` config, so a remote URL throws at render time.
 *
 * The team list is hand maintained here on purpose. If it ever needs to be editable without a
 * deploy, move it to Prisma and fetch it in the route, the way `investigacion` does. The page
 * component takes its content as a prop precisely so that migration touches only the route.
 */
export const nosotrosMeta = {
  title: 'Quiénes somos | LASCE',
  description:
    'Conozca el Laboratorio de Astrofísica Solar y Clima Espacial de la Universidad de Costa Rica: qué es, cuál es su propósito y quiénes lo integran.',
} as const

export type NosotrosCardIcon = 'sun' | 'radio' | 'instruments' | 'analysis' | 'education'

interface NosotrosTextSection {
  title: string
  paragraphs: readonly string[]
}

export interface TeamMember {
  /** Local path under `apps/web/public`, for example `/images/equipo/ana-mora.webp`. */
  src: string
  /** Rendered as a visible caption, never as alt text. */
  name: string
  role?: string
}

export interface NosotrosContent {
  hero: { kicker: string; title: string; lead: string }
  /** Provisional copy banner. Remove this key when the text is approved. */
  flag?: { label: string; message: string }
  overview: NosotrosTextSection
  purpose: NosotrosTextSection
  focusAreas: {
    title: string
    intro: string
    items: readonly {
      id: string
      icon: NosotrosCardIcon
      title: string
      description: string
    }[]
  }
  team: {
    title: string
    intro: string
    people: readonly TeamMember[]
  }
  institution: NosotrosTextSection
  backLink: { href: string; label: string }
}

export const nosotrosContent = {
  hero: {
    kicker: 'Portal público LASCE',
    title: 'Quiénes somos',
    lead: 'Laboratorio de Astrofísica Solar y Clima Espacial de la Universidad de Costa Rica.',
  },
  flag: {
    label: 'Información provisional',
    message:
      'El contenido de esta página es preliminar y está pendiente de revisión por parte del laboratorio.',
  },
  overview: {
    title: '¿Qué es LASCE?',
    paragraphs: [
      'El Laboratorio de Astrofísica Solar y Clima Espacial (LASCE) es un laboratorio de la Universidad de Costa Rica dedicado al estudio del Sol y de su influencia sobre el entorno terrestre. Reúne investigación en astrofísica solar, desarrollo instrumental y análisis de datos en un mismo grupo de trabajo.',
      'El laboratorio observa la actividad solar, desarrolla la infraestructura necesaria para registrarla y convierte esas observaciones en información que puede consultarse y reutilizarse.',
    ],
  },
  purpose: {
    title: 'Nuestro propósito',
    paragraphs: [
      'Generar conocimiento sobre la actividad solar y el clima espacial desde Costa Rica, y poner ese conocimiento a disposición de la comunidad científica, la academia y el público general.',
      'El propósito del laboratorio combina tres compromisos: sostener investigación de calidad, formar personas en ciencia y tecnología espacial, y comunicar los resultados de forma comprensible y accesible.',
    ],
  },
  focusAreas: {
    title: 'En qué trabajamos',
    intro:
      'El trabajo del laboratorio se organiza en áreas que se apoyan entre sí. Cada una cuenta con su propia sección en este portal.',
    items: [
      {
        id: 'solar-astrophysics',
        icon: 'sun',
        title: 'Astrofísica solar',
        description:
          'Estudio de la actividad del Sol y de los fenómenos que la originan, a partir de observaciones y modelos.',
      },
      {
        id: 'space-weather',
        icon: 'analysis',
        title: 'Clima espacial',
        description:
          'Seguimiento de las condiciones del Sol y del viento solar que pueden afectar sistemas tecnológicos en la Tierra.',
      },
      {
        id: 'radio-astronomy',
        icon: 'radio',
        title: 'Radioastronomía',
        description:
          'Observación en frecuencias de radio, incluido el desarrollo del Radio Observatorio de Santa Cruz.',
      },
      {
        id: 'instrumentation',
        icon: 'instruments',
        title: 'Instrumentación',
        description:
          'Diseño, construcción y mantenimiento de los instrumentos y sistemas que hacen posible la observación.',
      },
      {
        id: 'data',
        icon: 'analysis',
        title: 'Datos y análisis',
        description:
          'Procesamiento, resguardo y publicación de los datos científicos que produce el laboratorio.',
      },
      {
        id: 'outreach',
        icon: 'education',
        title: 'Docencia y divulgación',
        description:
          'Formación de estudiantes y comunicación de la ciencia espacial a públicos no especializados.',
      },
    ],
  },
  team: {
    title: 'El equipo',
    intro:
      'LASCE reúne a personas de distintas disciplinas: astrofísica, física, ingeniería, electrónica y computación.',
    people: [],
  },
  institution: {
    title: 'LASCE y la Universidad de Costa Rica',
    paragraphs: [
      'El laboratorio forma parte de la Universidad de Costa Rica y trabaja dentro de su misión de investigación, docencia y acción social. Esa pertenencia define cómo se produce el conocimiento y a quién se dirige: los resultados son públicos y están al servicio del país.',
    ],
  },
  backLink: {
    href: '/',
    label: 'Volver al inicio',
  },
} as const satisfies NosotrosContent
