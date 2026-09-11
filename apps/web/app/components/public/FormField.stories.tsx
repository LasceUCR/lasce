import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'

import { FormField, type FormFieldProps } from './FormField'

const meta: Meta<typeof FormField> = {
  component: FormField,
  parameters: {
    layout: 'centered',
  },
}

export default meta

type Story = StoryObj<typeof FormField>

function InteractiveFormField(props: FormFieldProps) {
  const [value, setValue] = useState(props.value)
  return <FormField {...props} onChange={setValue} value={value} />
}

export const Text: Story = {
  args: {
    label: 'Título',
    value: 'UCR pone en funcionamiento radiotelescopio para investigar el Sol',
  },
  render: (args) => <InteractiveFormField {...args} />,
}

export const Url: Story = {
  args: {
    label: 'Enlace',
    value: 'https://www.ucr.ac.cr',
    type: 'url',
  },
  render: (args) => <InteractiveFormField {...args} />,
}

export const Multiline: Story = {
  args: {
    label: 'Resumen',
    value: 'Reportaje sobre proyectos científicos costarricenses, entre ellos ROSAC.',
    multiline: true,
  },
  render: (args) => <InteractiveFormField {...args} />,
}

export const Empty: Story = {
  args: {
    label: 'Título',
    value: '',
    placeholder: 'Escriba un título...',
    required: true,
  },
  render: (args) => <InteractiveFormField {...args} />,
}
