import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'

import { Select } from './Select'

const meta: Meta<typeof Select> = {
  component: Select,
  decorators: [
    (Story) => (
      <div style={{ width: 'min(320px, 85vw)' }}>
        <Story />
      </div>
    ),
  ],
  render: function ControlledSelect(args) {
    const [value, setValue] = useState(args.value)
    return <Select {...args} value={value} onChange={setValue} />
  },
}
export default meta
type Story = StoryObj<typeof Select>

export const Default: Story = {
  args: {
    id: 'example-select',
    label: 'Producto científico',
    value: 'xrays',
    onChange: () => {},
    options: [
      { value: 'xrays', label: 'Flujo solar: rayos X', group: 'EXIS' },
      { value: 'pending', label: 'Producto pendiente', disabled: true, group: 'SEISS' },
      { value: 'particles', label: 'Partículas magnetosféricas de alta energía', group: 'SEISS' },
    ],
  },
}

export const LongList: Story = {
  args: {
    ...Default.args,
    options: Array.from({ length: 100 }, (_, index) => ({
      value: `channel-${index}`,
      label: `Electrones: telescopio ${Math.floor(index / 10) + 1}, banda ${(index % 10) + 1}`,
    })),
    value: 'channel-0',
  },
}

export const Disabled: Story = { args: { ...Default.args, disabled: true } }
