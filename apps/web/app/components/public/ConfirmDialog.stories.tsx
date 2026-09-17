import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ConfirmDialog } from './ConfirmDialog'

const meta: Meta<typeof ConfirmDialog> = {
  component: ConfirmDialog,
  parameters: {
    layout: 'centered',
  },
}

export default meta

type Story = StoryObj<typeof ConfirmDialog>

export const Default: Story = {
  args: {
    open: true,
    title: 'Eliminar noticia',
    message: '¿Eliminar esta noticia? Esta acción no se puede deshacer.',
    confirmVariant: 'danger',
    onCancel: () => {},
    onConfirm: () => {},
  },
}
