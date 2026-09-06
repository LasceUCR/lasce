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
 * `team.people` is transcribed from the ROSAC cards in `public/images/equipo/`. Those graphics
 * carry the name, role, affiliation and description as text baked into the image, which is
 * unreadable to a screen reader, unsearchable, and does not reflow (WCAG 1.4.5). The
 * transcription here is the accessible copy and the source of truth; the card is shown alongside
 * it as the designed artefact, with empty alternative text so nothing is announced twice.
 *
 * NOTE for LASCE: cards 6 and 7 (Gustavo Lara and Andrés Fallas) carry identical descriptions in
 * the source graphics. Transcribed verbatim; confirm whether that is intended.
 *
 * `team.people[].src` must be a local path under `apps/web/public`. `next.config.ts` declares no
 * `images` config, so a remote URL throws at render time.
 *
 * The team list is hand maintained here on purpose. If it ever needs to be editable without a
 * deploy, move it to Prisma and fetch it in the route, the way `investigacion` does. The page
 * component takes its content as a prop precisely so that migration touches only the route.
 */
export const nosotrosMeta = {
  title: 'Quiénes somos | LASCE',
  description:
    'El Laboratorio de Astrofísica Solar y Clima Espacial (LASCE), vinculado al Centro de Investigaciones Espaciales (CINESPA) de la Universidad de Costa Rica: qué es, qué investiga y quiénes lo integran.',
} as const

export type NosotrosCardIcon =
  'sun' | 'waves' | 'satellite' | 'code' | 'collaboration' | 'education'

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
  team: {
    title: string
    intro: string
    people: readonly TeamMember[]
  }
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
  backLink: {
    href: '/',
    label: 'Volver al inicio',
  },
} as const satisfies NosotrosContent
