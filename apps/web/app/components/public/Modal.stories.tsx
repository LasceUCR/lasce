import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { Modal } from './Modal'

const meta: Meta<typeof Modal> = {
  component: Modal,
  parameters: {
    layout: 'centered',
  },
}

export default meta

type Story = StoryObj<typeof Modal>

export const Open: Story = {
  args: {
    open: true,
    title: 'Eliminar noticia',
    children: <p>¿Está seguro de que desea eliminar esta noticia?</p>,
    onClose: () => {},
  },
}

export const Closed: Story = {
  args: {
    open: false,
    title: 'Eliminar noticia',
    children: <p>¿Está seguro de que desea eliminar esta noticia?</p>,
    onClose: () => {},
  },
}
