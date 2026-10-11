import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'

import { RosacStageForm } from './RosacStageForm'

const meta: Meta<typeof RosacStageForm> = {
  component: RosacStageForm,
  title: 'Public/ROSAC/RosacStageForm',
}

export default meta
type Story = StoryObj<typeof RosacStageForm>

export const Default: Story = {
  args: {
    stage: {
      title: 'Preparación para el montaje',
      description:
        'Antes del montaje principal se realizaron trabajos de preparación del sitio y de los componentes que posteriormente formarían parte de la estructura.',
    },
    onCancel: fn(),
    onSave: fn(),
  },
}
