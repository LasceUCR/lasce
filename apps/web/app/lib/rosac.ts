/**
 * Editorial source: LASCE_ROSAC_quienes_somos_y_que_hacemos.docx, supplied by LASCE.
 * Sections: ROSAC, ¿Qué hacemos?, ¿Por qué observar en radio? and La relación entre ambos.
 * Preserve the distinction between development goals and operational capabilities.
 * This module describes the public information page only; scientific consultation is separate.
 */
export const rosacInfoMeta = {
  title: 'Radioastronomía y ROSAC | LASCE',
  description:
    'Conoce el Radio Observatorio de Santa Cruz: su propósito, la antena de 11 metros, sus capacidades en desarrollo y su relación con LASCE.',
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
