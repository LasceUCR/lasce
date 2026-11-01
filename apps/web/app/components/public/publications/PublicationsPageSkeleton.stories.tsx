import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import es from '@/messages/es.json' with { type: 'json' }

import { PublicationsPageSkeleton } from './PublicationsPageSkeleton'

const page = es.publications.page

const meta: Meta<typeof PublicationsPageSkeleton> = {
  component: PublicationsPageSkeleton,
  parameters: { layout: 'fullscreen' },
  args: {
    kicker: page.kicker,
    title: page.title,
    lead: page.lead,
    listTitle: page.recent,
    label: page.loading,
    backLabel: es.common.backToHome,
  },
}
export default meta

type Story = StoryObj<typeof PublicationsPageSkeleton>

export const Default: Story = {}
