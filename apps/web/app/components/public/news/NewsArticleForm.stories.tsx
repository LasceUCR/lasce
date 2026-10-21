import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { emptyInitial, initialFromArticle } from '@/app/lib/news-form'

import { editableArticle, legacyArticle } from './fixtures'
import { NewsArticleForm } from './NewsArticleForm'

const meta: Meta<typeof NewsArticleForm> = {
  component: NewsArticleForm,
  parameters: {
    layout: 'centered',
  },
}

export default meta

type Story = StoryObj<typeof NewsArticleForm>

/** An item with both languages: the Spanish tab opens first, the English one holds its translation. */
export const EditExisting: Story = {
  args: {
    initial: initialFromArticle(editableArticle),
    onCancel: () => {},
    onSave: () => {},
  },
}

/** A blank form: both languages' title and abstract are required. */
export const AddNew: Story = {
  args: {
    initial: emptyInitial(),
    onCancel: () => {},
    onSave: () => {},
  },
}

/**
 * An item saved before languages existed: its base text on the Spanish tab with a note that it may
 * not be Spanish, and an empty English tab flagged as having no translation.
 */
export const Legacy: Story = {
  args: { ...EditExisting.args, initial: initialFromArticle(legacyArticle) },
}

/** The editor follows the site's language: an English interface over the same content. */
export const EnglishInterface: Story = {
  args: EditExisting.args,
  globals: { locale: 'en' },
}

/** A save in flight: every field and button is disabled. */
export const Saving: Story = {
  args: { ...EditExisting.args, busy: true },
}
