import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'

import { InstrumentProductSelect } from './InstrumentProductSelect'

const meta: Meta<typeof InstrumentProductSelect> = {
  component: InstrumentProductSelect,
  decorators: [
    (Story) => (
      <div style={{ width: 'min(320px, 85vw)' }}>
        <Story />
      </div>
    ),
  ],
  render: function ControlledInstrumentProductSelect(args) {
    const [value, setValue] = useState(args.value)
    return <InstrumentProductSelect {...args} value={value} onChange={setValue} />
  },
}
export default meta
type Story = StoryObj<typeof InstrumentProductSelect>

export const Default: Story = {
  args: {
    onChange: () => {},
    id: 'instrument-select',
    label: 'Instrumento y producto',
    value: 'xrays',
    options: [
      {
        value: 'xrays',
        label: 'Flujo solar: rayos X',
        group: 'EXIS — Sensores de irradiancia ultravioleta extrema y rayos X',
      },
      {
        value: 'euv',
        label: 'Flujo solar: EUV',
        group: 'EXIS — Sensores de irradiancia ultravioleta extrema y rayos X',
      },
      { value: 'magnetic', label: 'Campo geomagnético', group: 'MAG — Magnetómetro' },
      {
        value: 'pending',
        label: 'Producto pendiente',
        disabled: true,
        group: 'SEISS — Suite ambiental espacial in situ',
      },
      {
        value: 'particles',
        label: 'Partículas magnetosféricas de alta energía',
        group: 'SEISS — Suite ambiental espacial in situ',
      },
    ],
  },
}
