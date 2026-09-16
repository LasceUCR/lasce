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
    title: 'Áreas de investigación',
    subtitle: 'Principales temas de investigación desarrollados por el LASCE.',
    areas: [
      {
        slug: 'astrofisica-solar',
        title: 'Astrofísica solar',
        description: 'Estudio de fenómenos solares y su interacción con el medio interplanetario.',
      },
      {
        slug: 'clima-espacial',
        title: 'Clima espacial',
        description: 'Monitoreo, análisis y predicción del clima espacial en la región centroamericana.',
      },
      {
        slug: 'radioastronomia',
        title: 'Radioastronomía',
        description: 'Observación y análisis de emisiones de radio solar mediante la estación ROSAC.',
      },
      {
        slug: 'investigaciones-espaciales',
        title: 'Investigaciones espaciales',
        description: 'Desarrollo de instrumentación y proyectos aeroespaciales en colaboración con el CINESPA UCR.',
      },
    ],
  },
}

export const Empty: Story = {
  args: {
    title: 'Áreas de investigación',
    subtitle: 'Principales temas de investigación desarrollados por el LASCE.',
    areas: [],
  },
}
