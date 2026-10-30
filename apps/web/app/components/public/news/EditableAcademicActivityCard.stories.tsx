import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'

import { editableActivity, legacyActivity } from './AcademicActivityForm.stories'
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
    activity: editableActivity,
    onDelete: () => {},
    onSave: (_initial, _draft, _confirmed, _newPhotoUrl, close) => close(),
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
    activity: editableActivity,
    canEdit: true,
    canDelete: true,
    onDelete: () => {},
    onSave: (_initial, _draft, _confirmed, _newPhotoUrl, close) => close(),
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
    activity: editableActivity,
    canEdit: true,
    canDelete: false,
    onDelete: () => {},
    onSave: (_initial, _draft, _confirmed, _newPhotoUrl, close) => close(),
  },
  decorators: [
    (Story) => (
      <EditModeContext.Provider value={{ editMode: true, setEditMode: () => {} }}>
        <Story />
      </EditModeContext.Provider>
    ),
  ],
}

/** An activity with no English version yet: editors see a note in the form. */
export const LegacyActivity: Story = {
  args: { ...EditModeOn.args, activity: legacyActivity },
  decorators: EditModeOn.decorators,
}
