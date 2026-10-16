import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { IndicatorCard } from './IndicatorCard'

const meta: Meta<typeof IndicatorCard> = {
  component: IndicatorCard,
  decorators: [
    (Story) => (
      <div className="indicator-grid" style={{ gridTemplateColumns: 'minmax(0, 260px)' }}>
        <Story />
      </div>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof IndicatorCard>

export const Default: Story = {
  args: {
    label: 'Índice Dst',
    value: '-12 nT',
    description: 'Estable',
    tone: 'cyan',
    descriptionLang: 'es',
  },
}

/** The longest text a card holds: 15 characters each. */
export const LongestText: Story = {
  args: {
    label: 'Índice AE',
    value: '-1234.5 nT/hora',
    description: 'Actividad baja.',
    tone: 'blue',
    descriptionLang: 'es',
  },
}
