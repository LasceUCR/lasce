import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'

import { Toggle, type ToggleProps } from './Toggle'

const meta: Meta<typeof Toggle> = {
  component: Toggle,
  parameters: {
    layout: 'centered',
  },
}

export default meta

type Story = StoryObj<typeof Toggle>

function InteractiveToggle(props: ToggleProps) {
  const [checked, setChecked] = useState(props.checked)
  return <Toggle {...props} checked={checked} onChange={setChecked} />
}

export const Off: Story = {
  args: {
    checked: false,
    label: 'Modo edición',
  },
  render: (args) => <InteractiveToggle {...args} />,
}

export const On: Story = {
  args: {
    checked: true,
    label: 'Modo edición',
  },
  render: (args) => <InteractiveToggle {...args} />,
}

export const Disabled: Story = {
  args: {
    checked: false,
    label: 'Modo edición',
    disabled: true,
  },
}
