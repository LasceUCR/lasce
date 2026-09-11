import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { NewsArticleForm } from './NewsArticleForm'
import { news } from '@/app/lib/news'

const meta: Meta<typeof NewsArticleForm> = {
  component: NewsArticleForm,
  parameters: {
    layout: 'centered',
  },
}

export default meta

type Story = StoryObj<typeof NewsArticleForm>

export const EditExisting: Story = {
  args: {
    article: news[0]!,
    onCancel: () => {},
    onSave: () => {},
  },
}

export const AddNew: Story = {
  args: {
    article: null,
    onCancel: () => {},
    onSave: () => {},
  },
}
