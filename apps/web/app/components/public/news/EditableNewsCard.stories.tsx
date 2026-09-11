import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'
import { news } from '@/app/lib/news'

import { EditableNewsCard } from './EditableNewsCard'

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
    article: news[0]!,
    onDelete: () => {},
    onSave: () => {},
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
    article: news[0]!,
    onDelete: () => {},
    onSave: () => {},
  },
  decorators: [
    (Story) => (
      <EditModeContext.Provider value={{ editMode: true, setEditMode: () => {} }}>
        <Story />
      </EditModeContext.Provider>
    ),
  ],
}
