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
      slug: 'astrofisica-solar',
      title: 'Astrofísica solar',
      description: 'Estudio de fenómenos solares y su interacción con el medio interplanetario.',
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
    backHref: '/investigacion',
    backLabel: 'Volver a áreas de investigación',
  },
}

export const MinimalDetails: Story = {
  args: {
    area: {
      slug: 'investigaciones-espaciales',
      title: 'Investigaciones espaciales',
      description: 'Desarrollo de instrumentación y proyectos aeroespaciales en colaboración con el CINESPA UCR.',
    },
    backHref: '/investigacion',
    backLabel: 'Volver a áreas de investigación',
  },
}
