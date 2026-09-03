export const solarAstrophysicsMeta = {
  title: 'Física solar | LASCE',
  description:
    'Conozca qué estudia la física solar y cómo LASCE observa la actividad del Sol desde la Universidad de Costa Rica.',
} as const

export const solarAstrophysicsHero = {
  kicker: 'Área de trabajo LASCE',
  title: 'Física solar',
  introduction:
    'La física solar estudia el Sol como una estrella activa: su atmósfera, sus campos magnéticos, sus manchas, sus fulguraciones y los procesos que liberan energía hacia el medio interplanetario.',
  image: {
    src: '/images/decorative/Solar-Flare.png',
    alt: 'Fulguración solar visible sobre la superficie del Sol.',
  },
} as const

export const solarAstrophysicsOverview = {
  title: '¿Qué estudia la física solar?',
  intro:
    'Esta área ayuda a entender cómo se comporta el Sol y por qué su actividad cambia con el tiempo. El objetivo es explicar fenómenos solares con lenguaje claro y conectar esas observaciones con el trabajo científico del laboratorio.',
  items: [
    {
      title: 'Actividad solar',
      description:
        'Analiza señales visibles de actividad, como manchas solares, regiones activas y fulguraciones que aparecen en la atmósfera solar.',
    },
    {
      title: 'Campo magnético',
      description:
        'Estudia cómo el magnetismo solar organiza la corona, almacena energía y participa en eventos eruptivos.',
    },
    {
      title: 'Atmósfera solar',
      description:
        'Observa capas como la fotosfera, cromosfera y corona para comprender cómo se transporta energía en el Sol.',
    },
    {
      title: 'Eventos solares',
      description:
        'Relaciona fulguraciones y eyecciones de masa coronal con cambios que pueden propagarse por el espacio.',
    },
  ],
  flow: {
    title: 'Relación de observación',
    steps: ['Sol', 'Actividad solar', 'Observación', 'Análisis LASCE'] as const,
    caption:
      'LASCE observa manifestaciones de la actividad solar y las analiza para apoyar la comprensión científica del entorno espacial.',
  },
} as const

export const solarAstrophysicsLasce = {
  title: 'El trabajo de LASCE en física solar',
  note:
    'Contenido temporal pendiente de textos oficiales y validación por parte de LASCE.',
  paragraphs: [
    'LASCE estudia la actividad del Sol mediante observación, instrumentación y análisis de datos científicos.',
    'El laboratorio relaciona las señales solares con procesos físicos que ayudan a explicar el origen de fenómenos relevantes para el clima espacial.',
    'Esta página presenta una introducción general. Los proyectos, publicaciones, datos científicos y herramientas especializadas se publicarán en sus secciones correspondientes.',
  ],
} as const

export const solarAstrophysicsBackLink = {
  href: '/#areas-de-trabajo',
  label: 'Volver a las áreas de trabajo',
} as const
