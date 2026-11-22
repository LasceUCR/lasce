import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { SelectField } from './SelectField'

const meta: Meta<typeof SelectField> = {
  component: SelectField,
  parameters: {
    layout: 'padded',
  },
}

export default meta

type Story = StoryObj<typeof SelectField>

export const Default: Story = {
  args: {
    name: 'countryCode',
    label: 'País',
    placeholder: 'Selecciona un país',
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

export const Selected: Story = {
  args: {
    ...Default.args,
    defaultValue: 'CR',
  },
}

export const WithError: Story = {
  args: {
    ...Default.args,
    error: 'Selecciona tu país.',
  },
}

/** A list as long as the real country list, which scrolls inside the menu. */
export const LongList: Story = {
  args: {
    ...Default.args,
    options: Array.from({ length: 249 }, (_, index) => ({
      value: `C${index}`,
      label: `País ${index + 1}`,
    })),
  },
}
