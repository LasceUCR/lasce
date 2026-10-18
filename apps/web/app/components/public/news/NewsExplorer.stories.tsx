import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { EditModeContext, EditModeProvider } from '@/app/components/public/cms/EditModeProvider'
import type { NewsArticle } from '@/app/lib/news-schema'

import { editableArticle, englishArticle, legacyArticle, undatedArticle } from './fixtures'
import { NewsExplorer } from './NewsExplorer'

const meta: Meta<typeof NewsExplorer> = {
  component: NewsExplorer,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <EditModeProvider>
        <Story />
      </EditModeProvider>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof NewsExplorer>

const mockNews: NewsArticle[] = [editableArticle, legacyArticle, undatedArticle]

export const Default: Story = {
  args: {
    news: mockNews,
  },
}

/** A visitor reading in English: translated items, with the legacy one still in its base text. */
export const English: Story = {
  args: {
    news: [
      englishArticle,
      { ...legacyArticle, editing: undefined },
      { ...undatedArticle, editing: undefined },
    ],
  },
  globals: { locale: 'en' },
}

export const Empty: Story = {
  args: {
    news: [],
  },
}

/** Shows the edit/delete affordances and the "Agregar noticia" card the admin toggle reveals. */
export const EditMode: Story = {
  args: { ...Default.args, canCreate: true, canEdit: true, canDelete: true },
  decorators: [
    (Story) => (
      <EditModeContext.Provider value={{ editMode: true, setEditMode: () => {} }}>
        <Story />
      </EditModeContext.Provider>
    ),
  ],
}

/** An assistant account: `edit_components` only */
export const AssistantMode: Story = {
  args: { ...Default.args, canCreate: false, canEdit: true, canDelete: false },
  decorators: [
    (Story) => (
      <EditModeContext.Provider value={{ editMode: true, setEditMode: () => {} }}>
        <Story />
      </EditModeContext.Provider>
    ),
  ],
}
