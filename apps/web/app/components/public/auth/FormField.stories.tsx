import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { FormField } from './FormField'

const meta: Meta<typeof FormField> = {
  component: FormField,
  parameters: {
    layout: 'padded',
  },
}

export default meta

type Story = StoryObj<typeof FormField>

export const Default: Story = {
  args: {
    name: 'fullName',
    label: 'Nombre completo',
    placeholder: 'Nombre y apellidos',
    autoComplete: 'name',
    required: true,
  },
}

export const WithHint: Story = {
  args: {
    name: 'password',
    label: 'Contraseña',
    type: 'password',
    hint: 'Mínimo 8 caracteres.',
    autoComplete: 'new-password',
    required: true,
  },
}

export const WithError: Story = {
  args: {
    ...Default.args,
    defaultValue: 'A',
    error: 'Ingresa tu nombre completo.',
  },
}

export const Select: Story = {
  args: {
    name: 'countryCode',
    label: 'País',
    placeholder: 'Selecciona un país',
    autoComplete: 'country',
    required: true,
    options: [
      { value: 'AR', label: 'Argentina' },
      { value: 'CO', label: 'Colombia' },
      { value: 'CR', label: 'Costa Rica' },
      { value: 'ES', label: 'España' },
      { value: 'MX', label: 'México' },
    ],
  },
}
