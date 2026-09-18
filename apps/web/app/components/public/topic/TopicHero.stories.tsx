import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { TopicHero } from './TopicHero'

const meta: Meta<typeof TopicHero> = { component: TopicHero }
export default meta
type Story = StoryObj<typeof TopicHero>

export const Default: Story = {
  args: {
    kicker: 'LASCE',
    title: 'Datos',
    lead: 'Consulte los productos científicos disponibles.',
  },
}
export const Compact: Story = { args: { ...Default.args, variant: 'compact' } }
