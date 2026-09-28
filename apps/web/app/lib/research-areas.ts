import type { ResearchArea } from '@/app/components/public/research/ResearchAreasSection'

export const investigacionMeta = {
  title: 'Investigación | LASCE',
  description:
    'Áreas de investigación del Laboratorio de Astrofísica Solar y Clima Espacial de la Universidad de Costa Rica.',
} as const

export const investigacionHero = {
  kicker: 'Portal público LASCE',
  title: 'Áreas de investigación',
  lead: 'Principales ramas de investigación desarrolladas por el LASCE.',
} as const

export const investigacionBackLink = {
  href: '/',
  label: 'Volver al inicio',
} as const

export const researchAreas: ResearchArea[] = [
  {
    slug: 'radioastronomia-solar-evolucion-flares-cmes',
    title: 'Radioastronomía solar y evolución de Flares-CMEs',
    description:
      'Estudia las emisiones solares de radio y su relación con los flares, la evolución de las eyecciones de masa coronal, la aceleración de partículas y su propagación hacia el medio interplanetario.',
    src: '/images/research/radioastronomia-solar-evolucion-flares-cmes.jpg',
  },
  {
    slug: 'geomagnetismo-respuesta-regional-clima-espacial',
    title: 'Geomagnetismo y respuesta regional al clima espacial',
    description:
      'Analiza las variaciones del campo magnético terrestre producidas por la actividad solar. Incluye el cálculo de índices geomagnéticos para Costa Rica. Este estudio se lleva a cabo gracias al desarrollo de una tesis doctoral de la MSc. Johana Camacho en colaboración con el Instituto Nacional de Electricidad (ICE) y el Servicio de Clima Espacial México (SCiESMEX).',
    src: '/images/research/geomagnetismo-respuesta-regional-clima-espacial.jpg',
  },
  {
    slug: 'propagacion-prediccion-cmes-hacia-tierra',
    title: 'Propagación y predicción de CMEs hacia la Tierra',
    description:
      'Desarrolla modelos y herramientas para estimar la velocidad, la trayectoria y el tiempo de llegada de las CMEs a la Tierra. Esta rama incluye el desarrollo de la herramienta científica computacional SWAAT y su futura integración con observaciones de ROSAC.',
    src: '/images/research/propagacion-prediccion-cmes-hacia-tierra.png',
  },
  {
    slug: 'inteligencia-artificial-ciencia-datos-clima-espacial',
    title: 'Inteligencia artificial y ciencia de datos aplicada al clima espacial',
    description:
      'Emplea aprendizaje automático, automatización y generación de datos sintéticos para identificar eventos solares, procesar grandes volúmenes de observaciones y mejorar la predicción de fenómenos de clima espacial.',
    src: '/images/research/inteligencia-artificial-ciencia-datos-clima-espacial.jpg',
  },
  {
    slug: 'ionosfera-gnss-efectos-tecnologicos-clima-espacial',
    title: 'Ionosfera GNSS y efectos tecnológicos del clima espacial',
    description:
      'Busca hacer observaciones desde Costa Rica con equipos GNSS para determinar cómo la actividad solar y geomagnética modifica la ionosfera y afecta los sistemas de navegación satelital, las comunicaciones y otras tecnologías sensibles a las condiciones del entorno espacial en nuestro país.',
    src: '/images/research/ionosfera-gnss-efectos-tecnologicos-clima-espacial.jpg',
  },
  {
    slug: 'infraestructura-informatica-gestion-datos-clima-espacial',
    title: 'Infraestructura informática y gestión de datos de clima espacial',
    description:
      'Diseña y desarrolla plataformas informáticas para capturar, procesar, almacenar y consultar grandes volúmenes de datos solares provenientes de distintas fuentes. Esta rama también implementa bases de datos y servicios web especializados, y facilita el análisis interdisciplinario de la información en colaboración con investigadores en astrofísica solar y clima espacial.',
    src: '/images/research/infraestructura-informatica-gestion-datos-clima-espacial.jpg',
  },
  {
    slug: 'geomagnetismo-costa-rica',
    title: 'Geomagnetismo en Costa Rica',
    description:
      'Estudia las variaciones del campo magnético terrestre ante diferentes condiciones de actividad solar y geomagnética. Esta rama utiliza mediciones magnéticas realizadas en tiempo real en nuestro país para calcular índices geomagnéticos específicos para Costa Rica y desarrollar herramientas de monitoreo adaptadas al entorno regional.',
    src: '/images/research/geomagnetismo-costa-rica.jpg',
  },
]

export const researchAreaSlugs = researchAreas.map((area) => area.slug)

export function getResearchArea(slug: string): ResearchArea | undefined {
  return researchAreas.find((area) => area.slug === slug)
}
