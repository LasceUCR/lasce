import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { AccessTabs } from './AccessTabs'

const meta: Meta<typeof AccessTabs> = {
  component: AccessTabs,
  parameters: {
    layout: 'padded',
  },
}

export default meta

type Story = StoryObj<typeof AccessTabs>

export const Login: Story = {
  args: {
    initialTab: 'login',
    login: <section className="registration-card">Tarjeta de inicio de sesión</section>,
    register: <section className="registration-card">Tarjeta de registro</section>,
  },
}

export const Register: Story = {
  args: {
    ...Login.args,
    initialTab: 'register',
  },
}
