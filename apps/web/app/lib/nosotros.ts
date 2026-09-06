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
 * `team.people` is transcribed from the ROSAC cards in `public/images/equipo/`. Those graphics
 * carry the name, role, affiliation and description as text baked into the image, which is
 * unreadable to a screen reader, unsearchable, and does not reflow (WCAG 1.4.5). The transcription
 * here is the accessible copy and the source of truth; the card is shown alongside it as the
 * designed artefact, with empty alternative text so nothing is announced twice.
 *
 * NOTE for LASCE: cards 6 and 7 (Gustavo Lara and Andrés Fallas) carry identical descriptions in
 * the source graphics. Transcribed verbatim; confirm whether that is intended.
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
  /** Local path under `apps/web/public`. */
  src: string
  /** Rendered as visible text, never as alt text. */
  name: string
  /** The category shown at the top of the source card, for example `Investigador`. */
  role: string
  affiliation: string
  description: string
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
      'Las personas que desarrollan el Radio Observatorio de Santa Cruz (ROSAC), un proyecto que reúne astrofísica, física, ingeniería topográfica, eléctrica y mecánica, electrónica y computación, con colaboración nacional e internacional.',
    people: [
      {
        src: '/images/equipo/1.webp',
        name: 'Dra. Carolina Salas Matamoros',
        role: 'Investigadora principal',
        affiliation: 'Centro de Investigaciones Espaciales (CINESPA), UCR',
        description:
          'Responsable de la planificación estratégica de los recursos necesarios para el adecuado montaje e instalación del radiotelescopio, así como líder en la gestión y análisis de los datos obtenidos a través de dicho instrumento.',
      },
      {
        src: '/images/equipo/2.webp',
        name: 'Dr. Miguel Velázquez',
        role: 'Investigador',
        affiliation: 'Instituto Nacional de Astrofísica, Óptica y Electrónica, México',
        description: 'Encargado del desarrollo de la instrumentación en ROSAC.',
      },
      {
        src: '/images/equipo/3.webp',
        name: 'Dr. David Gale',
        role: 'Investigador',
        affiliation:
          'Instituto Nacional de Astrofísica, Óptica y Electrónica (INAOE), Puebla, México',
        description:
          'Instalación y alineación de los reflectores del telescopio. Sistemas mecánicos, pruebas de movimiento, protección contra descargas eléctricas. Apoyo en general.',
      },
      {
        src: '/images/equipo/4.webp',
        name: 'Dr. Óscar Núñez',
        role: 'Investigador',
        affiliation: 'Escuela de Ingeniería Eléctrica, UCR',
        description: 'Encargado del sistema eléctrico y soporte técnico en los motorreductores.',
      },
      {
        src: '/images/equipo/5.webp',
        name: 'Dr. Federico Ruiz',
        role: 'Investigador',
        affiliation: 'Instituto de Investigaciones en Ingeniería (INII), UCR',
        description:
          'Encargado de la implementación y puesta en operación de los sensores y actuadores, así como del desarrollo del controlador y de los sistemas de software asociados al radiotelescopio ROSAC.',
      },
      {
        src: '/images/equipo/6.webp',
        name: 'MSc. Gustavo Lara',
        role: 'Investigador',
        affiliation: 'Escuela de Ingeniería Topográfica, UCR',
        description:
          'Encargado del control técnico y geodésico, ejecutando desde la nivelación de la base, la calibración angular, el monitoreo de deformaciones de la parábola y el diseño de la red de control. Provee los datos paramétricos para la configuración y el funcionamiento del software de control y seguimiento del radiotelescopio.',
      },
      {
        src: '/images/equipo/7.webp',
        name: 'Ing. Andrés Fallas',
        role: 'Investigador',
        affiliation: 'Escuela de Ingeniería Topográfica, UCR',
        description:
          'Encargado del control técnico y geodésico, ejecutando desde la nivelación de la base, la calibración angular, el monitoreo de deformaciones de la parábola y el diseño de la red de control. Provee los datos paramétricos para la configuración y el funcionamiento del software de control y seguimiento del radiotelescopio.',
      },
      {
        src: '/images/equipo/8.webp',
        name: 'MSc. Wagner Mejías',
        role: 'Investigador',
        affiliation: 'Escuela de Ingeniería Mecánica, UCR',
        description:
          'Instalación mecánica de la estructura, mantenimiento preventivo y correctivo, adaptaciones y mejoras en la estructura en general.',
      },
      {
        src: '/images/equipo/9.webp',
        name: 'Dr. Eduardo Ibarra',
        role: 'Colaborador externo',
        affiliation:
          'Investigador en ingeniería de microondas en Quantum Motion Technologies, Londres',
        description:
          'Colaborador en el desarrollo y pruebas de la etapa de recepción en el rango de 100 MHz a 1.1 GHz, el análisis de sensibilidad del receptor, el diseño del radiotelescopio y en las labores de instalación eléctrica y control del sistema de guiado de la antena.',
      },
      {
        src: '/images/equipo/10.webp',
        name: 'Ing. Andrés Corrales',
        role: 'Colaborador externo',
        affiliation: 'Hewlett Packard Enterprise',
        description:
          'Diseñador, desarrollador y mantenedor del software de control del radiotelescopio y software de usuario final.',
      },
      {
        src: '/images/equipo/11.webp',
        name: 'Ing. Andrés Gamboa',
        role: 'Colaborador externo',
        affiliation: 'Cirtec Medical Enterprise',
        description:
          'Apoyo en tareas de mantenimiento del radiotelescopio, así como en labores electromecánicas relacionadas con el montaje de instrumentos.',
      },
      {
        src: '/images/equipo/12.webp',
        name: 'Jelmuth Rojas',
        role: 'Colaborador externo',
        affiliation: 'INDI CR',
        description: 'Apoyo en tareas de nivelación de la estructura.',
      },
      {
        src: '/images/equipo/13.webp',
        name: 'Barnald Bocker',
        role: 'Asistente',
        affiliation: 'Estudiante de la Escuela de Física, UCR',
        description:
          'Apoyo en el desarrollo y mantenimiento del software de control del ROSAC y protocolos de comunicación.',
      },
      {
        src: '/images/equipo/14.webp',
        name: 'MSc. Fabián Chaverri',
        role: 'Futuro estudiante de doctorado',
        affiliation: 'Centro de Investigaciones Espaciales (CINESPA), UCR',
        description:
          'Futuro estudiante de doctorado con tesis en instrumentación astronómica ligada al proyecto.',
      },
    ],
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
