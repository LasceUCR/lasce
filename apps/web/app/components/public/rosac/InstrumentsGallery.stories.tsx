import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { rosacInstrumentsContent } from '@/app/lib/rosac-instruments'
import { InstrumentCard } from './InstrumentCard'
import { InstrumentsGallery } from './InstrumentsGallery'

const meta: Meta<typeof InstrumentsGallery> = {
  component: InstrumentsGallery,
  parameters: { layout: 'fullscreen' },
}

export default meta
type Story = StoryObj<typeof InstrumentsGallery>

export const Default: Story = {
  args: {
    label: rosacInstrumentsContent.title,
    children: rosacInstrumentsContent.items.map((item) => (
      <InstrumentCard instrument={item} key={item.id} />
    )),
  },
}
