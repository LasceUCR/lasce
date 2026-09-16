import type { ResearchArea } from '@/app/components/public/research/ResearchAreasSection'

export const investigacionMeta = {
  title: 'Investigación | LASCE',
  description:
    'Áreas de investigación del Laboratorio de Astrofísica Solar y Clima Espacial de la Universidad de Costa Rica.',
} as const

export const investigacionHero = {
  kicker: 'Portal público LASCE',
  title: 'Áreas de investigación',
  lead: 'Principales temas de investigación desarrollados por el LASCE.',
} as const

export const investigacionBackLink = {
  href: '/',
  label: 'Volver al inicio',
} as const

export const researchAreas: ResearchArea[] = [
  {
    slug: 'astrofisica-solar',
    title: 'Astrofísica solar',
    description: 'Estudio de fenómenos solares y su interacción con el medio interplanetario.',
    src: '/images/research/astrofisica-solar.jpg',
    lead: 'Investigación de la estructura magnética, fulguraciones y emisiones en la atmósfera solar y su propagación hacia la Tierra.',
    objectives: [
      'Analizar los mecanismos de emisión y eyección de masa coronal.',
      'Modelar el transporte de partículas energéticas solares.',
      'Monitorear eventos de alta energía en tiempo casi real.',
    ],
    scope:
      'Abarca la observación continua y el análisis espectral de eventos solares, utilizando datos de observatorios espaciales y terrestres para comprender la dinámica de la actividad solar.',
    topics: [
      'Física de la corona solar',
      'Fulguraciones y eyecciones de masa coronal (CME)',
      'Transporte de partículas energéticas solares (SEP)',
    ],
  },
  {
    slug: 'clima-espacial',
    title: 'Clima espacial',
    description: 'Monitoreo, análisis y predicción del clima espacial en la región centroamericana.',
    src: '/images/research/clima-espacial.jpg',
    lead: 'Estudio del impacto de la actividad solar sobre el entorno geomagnético e ionosférico de Costa Rica y Centroamérica.',
    objectives: [
      'Evaluar el impacto de tormentas geomagnéticas en redes tecnológicas.',
      'Caracterizar la variabilidad ionosférica sobre Costa Rica y la región.',
      'Desarrollar modelos de alerta temprana ante perturbaciones espaciales.',
    ],
    scope:
      'Comprende el estudio de la respuesta ionosférica y geomagnética ante fenómenos solares extremos, integrando mediciones de estaciones receptoras y modelos computacionales.',
    topics: [
      'Perturbaciones ionosféricas itinerantes (TIDs)',
      'Corrientes inducidas geomagnéticamente (GIC)',
      'Sistemas de alerta temprana y modelado numérico',
    ],
  },
  {
    slug: 'radioastronomia',
    title: 'Radioastronomía',
    description: 'Observación y análisis de emisiones de radio solar mediante la estación ROSAC.',
    src: '/images/research/radioastronomia.jpg',
    lead: 'Detección y caracterización de ráfagas solares de baja frecuencia a través de la Radio-Observatorio Solar Astrofísico de Costa Rica (ROSAC).',
    objectives: [
      'Detectar ráfagas solares de tipo II, III y IV en frecuencias métricas y decamétricas.',
      'Calibrar y optimizar la cadena de adquisición de la estación ROSAC.',
      'Correlacionar emisiones de radio con eventos observados en rayos X y ultravioleta extremo.',
    ],
    scope:
      'Incluye el diseño, despliegue y análisis de datos de radiotelescopios locales, permitiendo estudiar la aceleración de electrones y ondas de choque en la corona solar.',
    topics: [
      'Espectrometría dinámica de ráfagas solares',
      'Instrumentación de radio y procesamiento digital de señales',
      'Interferometría de muy larga base (VLBI) aplicada al Sol',
    ],
  },
  {
    slug: 'investigaciones-espaciales',
    title: 'Investigaciones espaciales',
    description: 'Desarrollo de instrumentación y proyectos aeroespaciales en colaboración con el CINESPA UCR.',
    src: '/images/research/investigaciones-espaciales.jpg',
    lead: 'Diseño y validación de instrumentos científicos y cargas útiles para plataformas espaciales en el marco del Centro de Investigaciones Espaciales de la UCR.',
    objectives: [
      'Diseñar sensores para la medición in-situ del entorno espacial cercano.',
      'Probar y validar subsistemas bajo condiciones térmicas y de vacío simuladas.',
      'Promover capacidades tecnológicas nacionales en ingeniería aeroespacial.',
    ],
    scope:
      'Cubre desde la concepción y simulación de instrumentos espaciales hasta la integración en plataformas CubeSat y globos estratosféricos, en colaboración con el CINESPA UCR.',
    topics: [
      'Diseño de cargas útiles para CubeSats',
      'Sensores de radiación y magnetómetros compactos',
      'Ensayos de calificación ambiental aeroespacial',
    ],
  },
]

export const researchAreaSlugs = researchAreas.map((area) => area.slug)

export function getResearchArea(slug: string): ResearchArea | undefined {
  return researchAreas.find((area) => area.slug === slug)
}
