import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'

import { RosacActivityForm } from './RosacActivityForm'

const meta: Meta<typeof RosacActivityForm> = {
  component: RosacActivityForm,
  title: 'Public/ROSAC/RosacActivityForm',
}

export default meta
type Story = StoryObj<typeof RosacActivityForm>

export const EditExisting: Story = {
  args: {
    activity: {
      icon: 'tracking',
      title: 'Apuntado y seguimiento',
      description:
        'Desarrollamos un radiotelescopio capaz de apuntar y seguir fuentes astronómicas.',
    },
    onCancel: fn(),
    onSave: fn(),
  },
}

export const AddNew: Story = {
  args: {
    activity: null,
    onCancel: fn(),
    onSave: fn(),
  },
}
