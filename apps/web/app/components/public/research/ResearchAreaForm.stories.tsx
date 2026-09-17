import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ResearchAreaForm } from './ResearchAreaForm'

const meta: Meta<typeof ResearchAreaForm> = {
  component: ResearchAreaForm,
  parameters: { layout: 'centered' },
}

export default meta

type Story = StoryObj<typeof ResearchAreaForm>

export const Default: Story = {
  args: {
    area: {
      title: 'Física solar',
      description:
        'Estudiamos la actividad solar, sus fenómenos eruptivos y su impacto en el entorno espacial de la Tierra.',
      src: '',
    },
    onCancel: () => {},
    onSave: () => {},
  },
}
