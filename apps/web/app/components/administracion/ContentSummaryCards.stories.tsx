import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ContentSummaryCards } from './ContentSummaryCards'

const meta: Meta<typeof ContentSummaryCards> = {
  component: ContentSummaryCards,
  parameters: {
    layout: 'padded',
  },
}

export default meta

type Story = StoryObj<typeof ContentSummaryCards>

export const WithContent: Story = {
  args: {
    summary: {
      publications: 1204,
      news: 18,
      researchAreas: 5,
      lasceResearchers: 9,
      rosacResearchers: 4,
      instruments: 4,
    },
  },
}

export const SomeEmpty: Story = {
  args: {
    summary: {
      publications: 12,
      news: 0,
      researchAreas: 5,
      lasceResearchers: 0,
      rosacResearchers: 3,
      instruments: 4,
    },
  },
}
