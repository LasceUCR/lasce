/**
 * Editorial source: LASCE_ROSAC_quienes_somos_y_que_hacemos.docx, supplied by LASCE.
 * Sections: ROSAC, ¿Qué hacemos?, ¿Por qué observar en radio? and La relación entre ambos.
 * Preserve the distinction between development goals and operational capabilities.
 * This module describes the public information page only; scientific consultation is separate.
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
export const rosacInfoMeta = {
  title: 'Radioastronomía y ROSAC | LASCE',
  description:
    'Conoce el Radio Observatorio de Santa Cruz: su propósito, la antena de 11 metros, sus capacidades en desarrollo, el equipo de investigadores y su relación con LASCE.',
} as const

export type RosacCardIcon =
  | 'antenna'
  | 'location'
  | 'frequency'
  | 'sun'
  | 'tracking'
  | 'control'
  | 'receiver'
  | 'maintenance'
  | 'education'

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

interface RosacTextSection {
  title: string
  paragraphs: readonly string[]
}

interface RosacCardSection {
  title: string
  items: readonly {
    id: string
    icon: RosacCardIcon
    title: string
    description: string
  }[]
}

export interface RosacInfoContent {
  hero: { kicker: string; title: string; lead: string }
  overview: RosacTextSection
  characteristics: RosacCardSection
  activities: RosacCardSection
  radioObservation: RosacTextSection
  relationship: RosacTextSection
  team: {
    title: string
    intro: string
    emptyMessage: string
    people: readonly TeamMember[]
  }
  scientificConsultation: {
    title: string
    description: string
    buttonLabel: string
  }
  backLink: { href: string; label: string }
}

export const rosacInfoContent = {
  hero: {
    kicker: 'Área de trabajo LASCE',
    title: 'Radioastronomía',
    lead: 'Radio Observatorio de Santa Cruz (ROSAC)',
  },
  overview: {
    title: '¿Qué es ROSAC?',
    paragraphs: [
      'El Radio Observatorio de Santa Cruz (ROSAC) es un proyecto de la Universidad de Costa Rica ubicado en el Recinto de Santa Cruz, Guanacaste. Su desarrollo gira alrededor de la adaptación de una antena parabólica de 11 metros para uso astronómico, mediante una nueva montura, sistemas de movimiento y apuntado, receptores, electrónica y software de control.',
      'Su propósito es desarrollar capacidades nacionales para observar el Sol y otras fuentes celestes en frecuencias de radio. El proyecto conecta la investigación en astrofísica con la física, la electrónica, la ingeniería, las telecomunicaciones, el control automático y la programación.',
    ],
  },
  characteristics: {
    title: 'Características principales',
    items: [
      {
        id: 'antenna',
        icon: 'antenna',
        title: 'Antena de 11 metros',
        description:
          'Una antena parabólica se adapta para uso astronómico con una nueva montura y sistemas de movimiento y apuntado.',
      },
      {
        id: 'location',
        icon: 'location',
        title: 'Santa Cruz, Guanacaste',
        description:
          'El proyecto se desarrolla en el Recinto de Santa Cruz de la Universidad de Costa Rica.',
      },
      {
        id: 'frequencies',
        icon: 'frequency',
        title: 'Entre 100 y 1000 MHz',
        description:
          'Se preparan observaciones en este rango de frecuencias de radio, como parte del desarrollo del radiotelescopio.',
      },
      {
        id: 'sources',
        icon: 'sun',
        title: 'El Sol y otras fuentes celestes',
        description:
          'Se desarrollan capacidades para apuntar, seguir fuentes astronómicas y registrar sus emisiones de radio.',
      },
    ],
  },
  activities: {
    title: '¿Qué desarrollamos en ROSAC?',
    items: [
      {
        id: 'tracking',
        icon: 'tracking',
        title: 'Apuntado y seguimiento',
        description:
          'Desarrollamos un radiotelescopio capaz de apuntar y seguir fuentes astronómicas.',
      },
      {
        id: 'observations',
        icon: 'sun',
        title: 'Observaciones en radio',
        description:
          'Preparamos observaciones del Sol y de otras fuentes celestes entre 100 y 1000 MHz.',
      },
      {
        id: 'control',
        icon: 'control',
        title: 'Control y procesamiento de señales',
        description:
          'Diseñamos y probamos sistemas de control, seguimiento, posicionamiento, adquisición y procesamiento de señales.',
      },
      {
        id: 'receivers',
        icon: 'receiver',
        title: 'Receptores de radio',
        description:
          'Desarrollamos y evaluamos receptores para registrar emisiones de radio asociadas con objetos celestes.',
      },
      {
        id: 'infrastructure',
        icon: 'maintenance',
        title: 'Capacidades técnicas locales',
        description:
          'Generamos experiencia local en construcción, operación, calibración y mantenimiento de infraestructura de radioastronomía.',
      },
      {
        id: 'education',
        icon: 'education',
        title: 'Investigación, docencia y divulgación',
        description:
          'Impulsamos la ciencia desde Guanacaste, ampliando la participación regional en ciencia y tecnología.',
      },
    ],
  },
  radioObservation: {
    title: '¿Por qué observar en radio?',
    paragraphs: [
      'Las emisiones de radio permiten dar seguimiento a electrones acelerados y a estructuras que se desplazan a través de la corona solar y el medio interplanetario. Estas observaciones complementan las imágenes en luz visible, ultravioleta y rayos X, y ayudan a reconstruir la evolución de los eventos solares.',
    ],
  },
  relationship: {
    title: 'ROSAC y LASCE',
    paragraphs: [
      'LASCE integra datos, modelos y métodos de análisis para estudiar la actividad solar y su relación con el entorno terrestre. ROSAC aporta infraestructura nacional para observar el Sol en frecuencias de radio y fortalecer esas capacidades de investigación.',
      'LASCE convierte observaciones en conocimiento; ROSAC genera y fortalece una parte esencial de esas observaciones. Juntos conectan ciencia básica, desarrollo tecnológico, formación y aplicaciones de interés nacional.',
    ],
  },
  team: {
    title: 'Investigadores',
    intro:
      'Las personas que desarrollan el Radio Observatorio de Santa Cruz (ROSAC), un proyecto que reúne astrofísica, física, ingeniería topográfica, eléctrica y mecánica, electrónica y computación, con colaboración nacional e internacional.',
    emptyMessage: 'No hay información de investigadores disponible en este momento.',
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
  scientificConsultation: {
    title: 'Consulta científica',
    description:
      'La consulta de información científica de ROSAC estará disponible en una sección independiente de esta presentación del observatorio.',
    buttonLabel: 'Consultar información científica',
  },
  backLink: {
    href: '/#areas-de-trabajo',
    label: 'Volver a las áreas y accesos principales',
  },
} as const satisfies RosacInfoContent
