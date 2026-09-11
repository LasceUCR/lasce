import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'
import { news } from '@/app/lib/news'

import { NewsExplorer } from './NewsExplorer'

const meta: Meta<typeof NewsExplorer> = {
  component: NewsExplorer,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <EditModeContext.Provider value={{ editMode: false, setEditMode: () => {} }}>
        <Story />
      </EditModeContext.Provider>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof NewsExplorer>

export const Default: Story = {
  args: {
    news,
  },
}

export const Empty: Story = {
  args: {
    news: [],
  },
}

export const EditModeOn: Story = {
  args: {
    news,
  },
  decorators: [
    (Story) => (
      <EditModeContext.Provider value={{ editMode: true, setEditMode: () => {} }}>
        <Story />
      </EditModeContext.Provider>
    ),
  ],
}
