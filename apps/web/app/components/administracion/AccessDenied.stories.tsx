import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { AccessDenied } from './AccessDenied'

const meta: Meta<typeof AccessDenied> = {
  component: AccessDenied,
}

export default meta

type Story = StoryObj<typeof AccessDenied>

export const Default: Story = {
  args: {
    message: 'No tienes autorización para configurar los permisos de los roles.',
  },
}

export const CustomTitle: Story = {
  args: {
    title: 'No autorizado',
    message: 'No tienes autorización para crear páginas.',
  },
}
