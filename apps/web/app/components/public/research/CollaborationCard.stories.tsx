import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { CollaborationCard } from './CollaborationCard'

const meta: Meta<typeof CollaborationCard> = {
  component: CollaborationCard,
}

export default meta

type Story = StoryObj<typeof CollaborationCard>

export const National: Story = {
  args: {
    name: 'Instituto Tecnológico de Costa Rica',
    acronym: 'TEC',
    country: 'Costa Rica',
    scope: 'national',
  },
}

export const International: Story = {
  args: {
    name: 'Facultad de Ciencias Exactas y Tecnología',
    acronym: 'FACET, UNT',
    country: 'Argentina',
    scope: 'international',
  },
}

export const WithoutAcronym: Story = {
  args: {
    name: 'Observatorio París-Meudon',
    country: 'Francia',
    scope: 'international',
  },
}
