import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ResearchAreaPage } from './ResearchAreaPage'

const meta: Meta<typeof ResearchAreaPage> = {
  component: ResearchAreaPage,
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta

type Story = StoryObj<typeof ResearchAreaPage>

export const Default: Story = {
  args: {
    area: {
      slug: 'radioastronomia-solar-evolucion-flares-cmes',
      title: 'Radioastronomía solar y evolución de Flares-CMEs',
      description:
        'Estudia las emisiones solares de radio y su relación con los flares, la evolución de las eyecciones de masa coronal, la aceleración de partículas y su propagación hacia el medio interplanetario.',
      src: '/images/research/radioastronomia-solar-evolucion-flares-cmes.jpg',
    },
    backHref: '/investigacion',
    backLabel: 'Volver a áreas de investigación',
  },
}

export const MinimalDetails: Story = {
  args: {
    area: {
      slug: 'propagacion-prediccion-cmes-hacia-tierra',
      title: 'Propagación y predicción de CMEs hacia la Tierra',
      description:
        'Desarrolla modelos y herramientas para estimar la velocidad, la trayectoria y el tiempo de llegada de las CMEs a la Tierra. Esta rama incluye el desarrollo de la herramienta científica computacional SWAAT y su futura integración con observaciones de ROSAC.',
      src: '/images/research/propagacion-prediccion-cmes-hacia-tierra.jpg',
    },
    backHref: '/investigacion',
    backLabel: 'Volver a áreas de investigación',
  },
}
