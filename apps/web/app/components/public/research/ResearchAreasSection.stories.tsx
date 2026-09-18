import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ResearchAreasSection } from './ResearchAreasSection'

const meta: Meta<typeof ResearchAreasSection> = {
  component: ResearchAreasSection,
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta

type Story = StoryObj<typeof ResearchAreasSection>

export const Default: Story = {
  args: {
    id: 'research-areas',
    areas: [
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
          'Analiza las variaciones del campo magnético terrestre producidas por la actividad solar. Incluye el cálculo de índices geomagnéticos para Costa Rica.',
        src: '/images/research/geomagnetismo-respuesta-regional-clima-espacial.jpg',
      },
      {
        slug: 'propagacion-prediccion-cmes-hacia-tierra',
        title: 'Propagación y predicción de CMEs hacia la Tierra',
        description:
          'Desarrolla modelos y herramientas para estimar la velocidad, la trayectoria y el tiempo de llegada de las CMEs a la Tierra. Esta rama incluye el desarrollo de la herramienta científica computacional SWAAT y su futura integración con observaciones de ROSAC.',
        src: '/images/research/propagacion-prediccion-cmes-hacia-tierra.jpg',
      },
    ],
  },
}

export const Empty: Story = {
  args: {
    id: 'research-areas-empty',
    areas: [],
  },
}
