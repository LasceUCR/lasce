import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { rosacInfoContent } from '@/app/lib/rosac'

import { DonationCard } from './DonationCard'

const meta: Meta<typeof DonationCard> = {
  component: DonationCard,
  parameters: { layout: 'padded' },
}

export default meta

type Story = StoryObj<typeof DonationCard>

export const Default: Story = {
  args: {
    donation: rosacInfoContent.donations.items[0],
  },
}
