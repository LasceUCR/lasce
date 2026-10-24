import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'

import { RosacCharacteristicForm } from './RosacCharacteristicForm'

const meta: Meta<typeof RosacCharacteristicForm> = {
  component: RosacCharacteristicForm,
  title: 'Public/ROSAC/RosacCharacteristicForm',
}

export default meta
type Story = StoryObj<typeof RosacCharacteristicForm>

export const Default: Story = {
  args: {
    characteristic: {
      id: 'characteristic-1',
      icon: 'antenna',
      title: 'Antena de 11 metros',
      description:
        'Una antena parabólica se adapta para uso astronómico con una nueva montura y sistemas de movimiento y apuntado.',
      editing: {
        content: {
          es: {
            title: 'Antena de 11 metros',
            description:
              'Una antena parabólica se adapta para uso astronómico con una nueva montura y sistemas de movimiento y apuntado.',
          },
          en: {
            title: '11-meter Antenna',
            description:
              'A parabolic antenna is adapted for astronomical use with a new mount and movement and pointing systems.',
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
