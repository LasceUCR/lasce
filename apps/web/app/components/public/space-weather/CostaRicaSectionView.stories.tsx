import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { spaceWeatherCostaRica } from '@/app/lib/space-weather'

import { CostaRicaSectionView } from './CostaRicaSectionView'
import { bilingualSection, legacySection } from './fixtures'

const meta: Meta<typeof CostaRicaSectionView> = {
  component: CostaRicaSectionView,
  parameters: { layout: 'fullscreen' },
}

export default meta

type Story = StoryObj<typeof CostaRicaSectionView>

/** As stored, with two paragraphs. */
export const Stored: Story = {
  args: { section: bilingualSection },
}

/** No row yet: the catalogue's text, in the page's language. */
export const CatalogueFallback: Story = {
  args: { section: spaceWeatherCostaRica },
}

/** A legacy section shown in English: its base text, whose language is unknown. */
export const Legacy: Story = {
  args: { section: legacySection },
}
