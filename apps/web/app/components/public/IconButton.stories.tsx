import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Check, Pencil, Trash2, X } from 'lucide-react'

import { IconButton } from './IconButton'

const meta: Meta<typeof IconButton> = {
  component: IconButton,
  parameters: {
    layout: 'centered',
  },
}

export default meta

type Story = StoryObj<typeof IconButton>

export const Edit: Story = {
  args: {
    icon: <Pencil size={16} strokeWidth={1.8} />,
    label: 'Editar',
  },
}

export const Delete: Story = {
  args: {
    icon: <Trash2 size={16} strokeWidth={1.8} />,
    label: 'Eliminar',
    variant: 'danger',
  },
}

export const Save: Story = {
  args: {
    icon: <Check size={16} strokeWidth={1.8} />,
    label: 'Guardar',
  },
}

export const Cancel: Story = {
  args: {
    icon: <X size={16} strokeWidth={1.8} />,
    label: 'Cancelar',
  },
}

export const Disabled: Story = {
  args: {
    icon: <Check size={16} strokeWidth={1.8} />,
    label: 'Guardar',
    disabled: true,
  },
}
