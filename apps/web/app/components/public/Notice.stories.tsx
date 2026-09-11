import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { Notice } from './Notice'

const meta: Meta<typeof Notice> = { component: Notice }
export default meta
type Story = StoryObj<typeof Notice>

export const Information: Story = {
  args: { children: 'Observaciones disponibles en el intervalo seleccionado.' },
}
export const Warning: Story = {
  args: { tone: 'warning', children: 'Datos simulados para preparar la integración.' },
}
export const Error: Story = {
  args: { tone: 'error', role: 'alert', children: 'No fue posible consultar los datos.' },
}
export const Loading: Story = {
  args: { role: 'status', children: 'Consultando las observaciones disponibles…' },
}
