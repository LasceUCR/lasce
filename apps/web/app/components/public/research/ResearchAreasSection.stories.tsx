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
        slug: 'area-uno',
        title: 'Área de investigación 1',
        description: 'Descripción provisional del área de investigación 1.',
      },
      {
        slug: 'area-dos',
        title: 'Área de investigación 2',
        description: 'Descripción provisional del área de investigación 2.',
      },
      {
        slug: 'area-tres',
        title: 'Área de investigación 3',
        description: 'Descripción provisional del área de investigación 3.',
      },
      {
        slug: 'area-cuatro',
        title: 'Área de investigación 4',
        description: 'Descripción provisional del área de investigación 4.',
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
