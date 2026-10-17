import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'

import { EditableNewsCard } from './EditableNewsCard'
import { editableArticle, legacyArticle } from './fixtures'

const meta: Meta<typeof EditableNewsCard> = {
  component: EditableNewsCard,
  parameters: {
    layout: 'centered',
  },
}

export default meta

type Story = StoryObj<typeof EditableNewsCard>

export const ViewMode: Story = {
  args: {
    article: editableArticle,
    onDelete: () => {},
    onSave: (_initial, _draft, _confirmed, close) => close(),
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
    article: editableArticle,
    canEdit: true,
    canDelete: true,
    onDelete: () => {},
    onSave: (_initial, _draft, _confirmed, close) => close(),
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
    article: editableArticle,
    canEdit: true,
    canDelete: false,
    onDelete: () => {},
    onSave: (_initial, _draft, _confirmed, close) => close(),
  },
  decorators: [
    (Story) => (
      <EditModeContext.Provider value={{ editMode: true, setEditMode: () => {} }}>
        <Story />
      </EditModeContext.Provider>
    ),
  ],
}

/** An item with no English version yet: editors see a note on the card. */
export const LegacyItem: Story = {
  args: { ...EditModeOn.args, article: legacyArticle },
  decorators: EditModeOn.decorators,
}
