import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'

import { RosacAcknowledgmentForm } from './RosacAcknowledgmentForm'

const meta: Meta<typeof RosacAcknowledgmentForm> = {
  component: RosacAcknowledgmentForm,
  title: 'Public/ROSAC/RosacAcknowledgmentForm',
}

export default meta
type Story = StoryObj<typeof RosacAcknowledgmentForm>

export const EditExisting: Story = {
  args: {
    institution: {
      id: 'cinespa',
      name: 'Centro de Investigaciones Espaciales (CINESPA), UCR',
      logo: {
        src: '/images/ROSAC/acknowledgments/cinespa.webp',
        alt: 'Logo del Centro de Investigaciones Espaciales (CINESPA)',
      },
    },
    onCancel: fn(),
    onSave: fn(),
  },
}

export const AddNew: Story = {
  args: {
    institution: null,
    onCancel: fn(),
    onSave: fn(),
  },
}
