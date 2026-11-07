import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'

import { mockActivity } from './AcademicActivityCard.stories'
import { EditableAcademicActivityCard } from './EditableAcademicActivityCard'

const meta: Meta<typeof EditableAcademicActivityCard> = {
  component: EditableAcademicActivityCard,
  parameters: {
    layout: 'centered',
  },
}

export default meta

type Story = StoryObj<typeof EditableAcademicActivityCard>

export const ViewMode: Story = {
  args: {
    activity: mockActivity,
    onDelete: () => {},
    onSave: (_values, close) => close(),
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
    activity: mockActivity,
    canEdit: true,
    canDelete: true,
    onDelete: () => {},
    onSave: (_values, close) => close(),
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
    activity: mockActivity,
    canEdit: true,
    canDelete: false,
    onDelete: () => {},
    onSave: (_values, close) => close(),
  },
  decorators: [
    (Story) => (
      <EditModeContext.Provider value={{ editMode: true, setEditMode: () => {} }}>
        <Story />
      </EditModeContext.Provider>
    ),
  ],
}
