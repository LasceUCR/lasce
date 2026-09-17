import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { HeroObservationBadge } from './HeroObservationBadge'

const meta: Meta<typeof HeroObservationBadge> = {
  component: HeroObservationBadge,
  parameters: {
    layout: 'padded',
  },
}

export default meta

type Story = StoryObj<typeof HeroObservationBadge>

export const Loading: Story = {
  args: {
    observation: { status: 'loading' },
  },
}

export const Ready: Story = {
  args: {
    observation: {
      status: 'ready',
      src: '/images/decorative/goes-suvi-195-fallback.png',
      observedAtIso: '2026-09-15T18:40:00Z',
      observedAtLabel: '2026-09-15 18:40 UTC',
    },
  },
}

export const Unavailable: Story = {
  args: {
    observation: { status: 'unavailable' },
  },
}
