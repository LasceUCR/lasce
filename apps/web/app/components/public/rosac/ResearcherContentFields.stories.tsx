import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import type { NosotrosResearcherEditingData } from '@/app/lib/nosotros-researcher-schema'

import { ResearcherContentFields } from './ResearcherContentFields'

const bilingualResearcher: NosotrosResearcherEditingData = {
  content: {
    es: {
      role: 'Investigadora principal',
      description: 'Orienta la definición de las líneas de investigación del laboratorio.',
    },
    en: {
      role: 'Principal investigator',
      description: 'Guides the definition of the laboratory research lines.',
    },
  },
  isLegacy: false,
  version: '2026-10-15T15:00:00.000Z',
}

/** Saved before languages existed: its base text is English and it has no translation row. */
const legacyResearcher: NosotrosResearcherEditingData = {
  content: {
    es: { role: 'Principal investigator', description: null },
    en: null,
  },
  isLegacy: true,
  version: '2024-07-30T12:00:00.000Z',
}

const meta: Meta<typeof ResearcherContentFields> = {
  component: ResearcherContentFields,
  parameters: { layout: 'centered' },
}

export default meta

type Story = StoryObj<typeof ResearcherContentFields>

/** A researcher that has both languages. */
export const Default: Story = {
  args: { editing: bilingualResearcher },
}

/** A blank pair of tabs for a new researcher. */
export const Create: Story = {
  args: { editing: null },
}

/** A researcher with no English version: both languages must be completed to change the text. */
export const Legacy: Story = {
  args: { editing: legacyResearcher },
}
