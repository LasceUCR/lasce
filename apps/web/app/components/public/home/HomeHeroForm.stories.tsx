import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { heroInitial } from '@/app/lib/home-form'

import { bilingualHero, legacyHero } from './fixtures'
import { HomeHeroForm } from './HomeHeroForm'

const meta: Meta<typeof HomeHeroForm> = {
  component: HomeHeroForm,
}

export default meta

type Story = StoryObj<typeof HomeHeroForm>

export const Bilingual: Story = {
  args: {
    initial: heroInitial(bilingualHero.editing!),
    onSave: () => {},
    onCancel: () => {},
  },
}

/** No English version yet: the tabs say so, and both languages must be filled to save. */
export const Legacy: Story = {
  args: { ...Bilingual.args, initial: heroInitial(legacyHero.editing!) },
}
