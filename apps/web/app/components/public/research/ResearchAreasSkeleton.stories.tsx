import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ResearchAreasSkeleton } from './ResearchAreasSkeleton'

const meta: Meta<typeof ResearchAreasSkeleton> = {
  component: ResearchAreasSkeleton,
  parameters: { layout: 'fullscreen' },
}
export default meta

type Story = StoryObj<typeof ResearchAreasSkeleton>

export const Default: Story = { args: {} }
export const English: Story = { globals: { locale: 'en' } }
