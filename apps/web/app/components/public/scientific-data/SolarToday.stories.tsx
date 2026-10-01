import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { goesInstruments } from '@/app/lib/scientific-data'
import { SolarToday } from './SolarToday'

const meta: Meta<typeof SolarToday> = {
  component: SolarToday,
  parameters: { layout: 'fullscreen' },
}
export default meta
type Story = StoryObj<typeof SolarToday>

export const Default: Story = {
  args: {
    instrument: goesInstruments.find((item) => item.code === 'SUVI')!,
    product: 'Fe195',
    range: 'day',
    date: '2026-09-25',
    state: 'success',
    // Local layout fixtures; these are not five different scientific observations.
    images: [0, 3, 6, 9, 12].map((hour) => ({
      timestamp: `2026-09-25T${String(hour).padStart(2, '0')}:00:00Z`,
      imageUrl: '/images/decorative/Solar-Flare.png',
      alt: `Imagen solar de demostración a las ${hour}:00 UTC`,
    })),
    onProductChange: () => {},
    onRangeChange: () => {},
    onRefresh: () => {},
  },
}
export const Loading: Story = { args: { ...Default.args, state: 'loading', images: [] } }
export const Empty: Story = { args: { ...Default.args, images: [] } }
export const SourceError: Story = { args: { ...Default.args, state: 'error', images: [] } }
