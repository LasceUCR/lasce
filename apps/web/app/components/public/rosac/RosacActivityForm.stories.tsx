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
      id: 'activity-1',
      icon: 'tracking',
      title: 'Apuntado y seguimiento',
      description:
        'Desarrollamos un radiotelescopio capaz de apuntar y seguir fuentes astronómicas.',
      editing: {
        content: {
          es: {
            title: 'Apuntado y seguimiento',
            description:
              'Desarrollamos un radiotelescopio capaz de apuntar y seguir fuentes astronómicas.',
          },
          en: {
            title: 'Pointing and tracking',
            description:
              'We are developing a radio telescope capable of pointing and tracking astronomical sources.',
          },
        },
        isLegacy: false,
        version: '1',
      },
    },
    onCancel: fn(),
    onSave: fn(),
  },
}
