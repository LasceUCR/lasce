import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { uniformStatuses } from '@/app/lib/service-status'

import { ServicesPanel } from './ServicesPanel'

const meta: Meta<typeof ServicesPanel> = {
  component: ServicesPanel,
  parameters: {
    layout: 'padded',
  },
}

export default meta

type Story = StoryObj<typeof ServicesPanel>

export const AllOnline: Story = {
  args: {
    statuses: uniformStatuses('ok'),
  },
}

export const SomeOffline: Story = {
  args: {
    statuses: { ...uniformStatuses('ok'), workers: 'down', influxdb: 'down' },
  },
}

export const Checking: Story = {
  args: {
    statuses: uniformStatuses('checking'),
  },
}
