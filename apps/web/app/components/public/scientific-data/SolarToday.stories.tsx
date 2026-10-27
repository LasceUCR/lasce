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
/** Five placeholders in the strip's own layout, while today's images load. */
export const Loading: Story = { args: { ...Default.args, state: 'loading', images: [] } }

/** On a phone the placeholders follow the strip: one and a part of the next in view. */
export const LoadingMobile: Story = {
  ...Loading,
  globals: { viewport: { value: 'solarTodayMobile', isRotated: false } },
  parameters: {
    layout: 'fullscreen',
    viewport: {
      options: {
        solarTodayMobile: { name: 'Mobile (390px)', styles: { width: '390px', height: '844px' } },
      },
    },
  },
}

export const LoadingEnglish: Story = { ...Loading, globals: { locale: 'en' } }
export const Empty: Story = { args: { ...Default.args, images: [] } }
export const SourceError: Story = { args: { ...Default.args, state: 'error', images: [] } }
