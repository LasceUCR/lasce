import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { CollaborationCard } from './CollaborationCard'
import { researchCollaborations } from '@/app/lib/research-collaborations'

const meta: Meta<typeof CollaborationCard> = {
  component: CollaborationCard,
}

export default meta

type Story = StoryObj<typeof CollaborationCard>

export const National: Story = {
  args: {
    ...researchCollaborations[0],
    name: 'Instituto Tecnológico de Costa Rica',
    acronym: 'TEC',
    country: 'Costa Rica',
    scope: 'national',
  },
}

export const International: Story = {
  args: {
    ...researchCollaborations[2],
    name: 'Facultad de Ciencias Exactas y Tecnología',
    acronym: 'FACET, UNT',
    country: 'Argentina',
    scope: 'international',
  },
}

export const WithoutLogo: Story = {
  args: { ...National.args, logoPath: undefined },
}

export const WithoutWebsite: Story = {
  args: { ...International.args, websiteUrl: undefined },
}

export const WithoutMedia: Story = {
  args: { ...WithoutLogo.args, websiteUrl: undefined },
}

export const WithoutAcronym: Story = {
  args: {
    name: 'Observatorio París-Meudon',
    country: 'Francia',
    scope: 'international',
  },
}

export const TranslatedCountry: Story = {
  globals: { locale: 'en' },
  args: { ...WithoutAcronym.args, country: 'France', countryLocale: 'en' },
}

export const LegacyCountry: Story = {
  globals: { locale: 'en' },
  args: { ...WithoutAcronym.args, countryLocale: null },
}
