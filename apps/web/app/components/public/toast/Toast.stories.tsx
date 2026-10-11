import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { Toast } from './Toast'

const meta: Meta<typeof Toast> = {
  component: Toast,
  parameters: { layout: 'centered' },
}

export default meta

type Story = StoryObj<typeof Toast>

export const Success: Story = {
  args: { tone: 'success', message: 'Actividad agregada correctamente.', onDismiss: () => {} },
}

export const Error: Story = {
  args: {
    tone: 'error',
    message: 'No tiene permisos para modificar este contenido.',
    onDismiss: () => {},
  },
}

/** A validation failure: the reason lists every field to fix, so it wraps. */
export const LongMessage: Story = {
  args: {
    tone: 'error',
    message:
      'Faltan campos obligatorios o no son válidos: El título es obligatorio. El texto es obligatorio.',
    onDismiss: () => {},
  },
}
