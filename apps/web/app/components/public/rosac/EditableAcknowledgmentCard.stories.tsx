import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'
import type { RosacAcknowledgment } from '@/app/lib/rosac'

import { EditableAcknowledgmentCard } from './EditableAcknowledgmentCard'

const meta: Meta<typeof EditableAcknowledgmentCard> = {
  component: EditableAcknowledgmentCard,
  parameters: {
    layout: 'centered',
  },
}

export default meta

type Story = StoryObj<typeof EditableAcknowledgmentCard>

const mockInstitution: RosacAcknowledgment = {
  id: 'cinespa',
  name: 'Centro de Investigaciones Espaciales (CINESPA), UCR',
  logo: {
    src: '/images/ROSAC/acknowledgments/cinespa.webp',
    alt: 'Logo del Centro de Investigaciones Espaciales (CINESPA)',
  },
}

export const ViewMode: Story = {
  args: {
    institution: mockInstitution,
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
    institution: mockInstitution,
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

export const AssistantMode: Story = {
  args: {
    institution: mockInstitution,
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
