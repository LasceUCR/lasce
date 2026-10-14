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

const seiss = 'SEISS — Suite ambiental espacial in situ'
const suvi = 'SUVI — Generador de imágenes solares ultravioleta'

/** Groups taller than the 320 px menu, where expanding one has to scroll the menu. */
export const LargeGroups: Story = {
  args: {
    ...Default.args,
    value: 'MPSH',
    options: [
      ...(Default.args?.options ?? []).filter((option) => option.group !== seiss),
      { value: 'EHIS', label: 'Iones pesados energéticos (EHIS)', group: seiss },
      {
        value: 'MPSL',
        label: 'Electrones y protones magnetosféricos: baja energía (MPSL)',
        group: seiss,
      },
      {
        value: 'MPSH',
        label: 'Electrones y protones magnetosféricos: energía media y alta (MPSH)',
        group: seiss,
      },
      { value: 'SGPS', label: 'Protones solares y galácticos (SGPS)', group: seiss },
      ...[
        ['Fe093', '94 Å'],
        ['Fe131', '131 Å'],
        ['Fe171', '171 Å'],
        ['Fe195', '195 Å'],
        ['Fe284', '284 Å'],
        ['He303', '304 Å'],
      ].map(([code, wavelength]) => ({
        value: code!,
        label: `Imágenes solares: ${wavelength} (${code})`,
        group: suvi,
      })),
    ],
  },
}
