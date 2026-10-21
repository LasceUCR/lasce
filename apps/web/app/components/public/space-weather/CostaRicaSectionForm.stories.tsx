import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { sectionInitial } from '@/app/lib/space-weather-section-form'

import { CostaRicaSectionForm } from './CostaRicaSectionForm'
import { bilingualSection, legacySection } from './fixtures'

const meta: Meta<typeof CostaRicaSectionForm> = {
  component: CostaRicaSectionForm,
}

export default meta

type Story = StoryObj<typeof CostaRicaSectionForm>

export const Bilingual: Story = {
  args: {
    initial: sectionInitial(bilingualSection.editing!),
    onSave: () => {},
    onCancel: () => {},
  },
}

/** No English version yet: the tabs say so, and both languages must be filled to save. */
export const Legacy: Story = {
  args: { ...Bilingual.args, initial: sectionInitial(legacySection.editing!) },
}
