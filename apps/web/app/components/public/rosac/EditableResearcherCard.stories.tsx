import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'
import type { TeamMember } from '@/app/lib/rosac'

import { EditableResearcherCard } from './EditableResearcherCard'

const meta: Meta<typeof EditableResearcherCard> = {
  component: EditableResearcherCard,
  parameters: {
    layout: 'centered',
  },
}

export default meta

type Story = StoryObj<typeof EditableResearcherCard>

const mockResearcher: TeamMember = {
  id: 'carolina-salas',
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
    onSave: async () => null,
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
    onSave: async () => null,
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
    onSave: async () => null,
  },
  decorators: [
    (Story) => (
      <EditModeContext.Provider value={{ editMode: true, setEditMode: () => {} }}>
        <Story />
      </EditModeContext.Provider>
    ),
  ],
}
