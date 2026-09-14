import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { AccountSummary } from './AccountSummary'

const logoutAction = async () => {}

const meta: Meta<typeof AccountSummary> = {
  component: AccountSummary,
  parameters: {
    layout: 'padded',
  },
}

export default meta

type Story = StoryObj<typeof AccountSummary>

export const Visitor: Story = {
  args: {
    logoutAction,
    profile: {
      fullName: 'Ana Pérez Rojas',
      email: 'ana.perez@ucr.ac.cr',
      institution: 'Universidad de Costa Rica',
      countryName: 'Costa Rica',
      roleLabel: 'Visitante',
      memberSince: '13 de septiembre de 2026',
    },
  },
}

export const Admin: Story = {
  args: {
    ...Visitor.args,
    profile: {
      fullName: 'Carlos Salas Matamoros',
      email: 'carlos.salas@ucr.ac.cr',
      institution: 'LASCE, Universidad de Costa Rica',
      countryName: 'Costa Rica',
      roleLabel: 'Persona administradora',
      memberSince: '1 de marzo de 2026',
    },
  },
}
