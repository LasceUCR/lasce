import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'

import { EditableResearcherCard } from './EditableResearcherCard'
import type { PersonProfile } from './ResearcherForm'

const meta: Meta<typeof EditableResearcherCard> = {
  component: EditableResearcherCard,
  parameters: {
    layout: 'centered',
  },
}

export default meta

type Story = StoryObj<typeof EditableResearcherCard>

const mockResearcher: PersonProfile = {
  src: '/images/ROSAC/team/CarolinaSalas.jpg',
  name: 'Dra. Carolina Salas Matamoros',
  role: 'Investigadora principal',
  email: 'carolina.salas_mata@ucr.ac.cr',
  institution: 'Centro de Investigaciones Espaciales (CINESPA), UCR',
  description:
    'Responsable de la planificación estratégica de los recursos necesarios para el adecuado montaje e instalación del radiotelescopio.',
}

export const ViewMode: Story = {
  args: {
    researcher: mockResearcher,
    onDelete: () => {},
    onSave: async () => true,
  },
  decorators: [
    (Story) => (
      <EditModeContext.Provider value={{ editMode: false, setEditMode: () => {} }}>
        <Story />
      </EditModeContext.Provider>
    ),
  ],
}

export const EditModeOn: Story = {
  args: {
    researcher: mockResearcher,
    canEdit: true,
    canDelete: true,
    onDelete: () => {},
    onSave: async () => true,
  },
  decorators: [
    (Story) => (
      <EditModeContext.Provider value={{ editMode: true, setEditMode: () => {} }}>
        <Story />
      </EditModeContext.Provider>
    ),
  ],
}

/** An assistant account: `edit_components` but not `delete_components` — only the pencil shows. */
export const AssistantMode: Story = {
  args: {
    researcher: mockResearcher,
    canEdit: true,
    canDelete: false,
    onDelete: () => {},
    onSave: async () => true,
  },
  decorators: [
    (Story) => (
      <EditModeContext.Provider value={{ editMode: true, setEditMode: () => {} }}>
        <Story />
      </EditModeContext.Provider>
    ),
  ],
}

/** The opt-in bilingual card of `/nosotros`: its form has a tab per language. */
export const BilingualEditMode: Story = {
  args: {
    researcher: mockResearcher,
    canEdit: true,
    canDelete: true,
    contentLang: 'es',
    translation: {
      editing: {
        content: {
          es: { role: mockResearcher.role, description: mockResearcher.description ?? null },
          en: {
            role: 'Principal investigator',
            description:
              'In charge of the strategic planning of the resources needed to assemble and install the radio telescope.',
          },
        },
        isLegacy: false,
        version: '2026-10-15T15:00:00.000Z',
      },
    },
    onDelete: () => {},
    onSave: async () => true,
  },
  decorators: EditModeOn.decorators,
}
