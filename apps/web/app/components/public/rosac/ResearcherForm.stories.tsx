import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import type { NosotrosResearcherEditingData } from '@/app/lib/nosotros-researcher-schema'

import { ResearcherForm, type PersonProfile } from './ResearcherForm'

const meta: Meta<typeof ResearcherForm> = {
  component: ResearcherForm,
  parameters: { layout: 'centered' },
}

export default meta

type Story = StoryObj<typeof ResearcherForm>

const mockResearcher: PersonProfile = {
  src: '/images/ROSAC/team/CarolinaSalas.jpg',
  name: 'Dra. Carolina Salas Matamoros',
  role: 'Investigadora principal',
  email: 'carolina.salas_mata@ucr.ac.cr',
  institution: 'Centro de Investigaciones Espaciales (CINESPA), UCR',
  description:
    'Responsable de la planificación estratégica de los recursos necesarios para el adecuado montaje e instalación del radiotelescopio, así como líder en la gestión y análisis de los datos obtenidos a través de dicho instrumento.',
}

export const EditExisting: Story = {
  args: {
    researcher: mockResearcher,
    onCancel: () => {},
    onSave: () => {},
  },
}

export const AddNew: Story = {
  args: {
    researcher: null,
    onCancel: () => {},
    onSave: () => {},
  },
}

const bilingualResearcher: NosotrosResearcherEditingData = {
  content: {
    es: { role: mockResearcher.role, description: mockResearcher.description ?? null },
    en: {
      role: 'Principal investigator',
      description:
        'In charge of the strategic planning of the resources needed to assemble and install the radio telescope, and leader in the management and analysis of the data obtained through the instrument.',
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

/** The opt-in bilingual form of `/nosotros`: role and description in one tab per language. */
export const Bilingual: Story = {
  args: {
    researcher: mockResearcher,
    translation: { editing: bilingualResearcher },
    onCancel: () => {},
    onSave: () => {},
  },
}

/** A blank bilingual form for a new researcher. */
export const BilingualCreate: Story = {
  args: {
    researcher: null,
    translation: { editing: null },
    onCancel: () => {},
    onSave: () => {},
  },
}

/** A researcher with no English version: both languages must be completed to change the text. */
export const BilingualLegacy: Story = {
  args: {
    researcher: { ...mockResearcher, role: 'Principal investigator', description: undefined },
    translation: { editing: legacyResearcher },
    onCancel: () => {},
    onSave: () => {},
  },
}
