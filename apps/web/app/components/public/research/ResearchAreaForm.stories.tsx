import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { emptyInitial, initialFromArea } from '@/app/lib/research-area-form'

import { bilingualArea, legacyArea } from './fixtures'
import { ResearchAreaForm } from './ResearchAreaForm'

const meta: Meta<typeof ResearchAreaForm> = {
  component: ResearchAreaForm,
  parameters: { layout: 'centered' },
}

export default meta

type Story = StoryObj<typeof ResearchAreaForm>

/** A new area: every field empty, both languages required. */
export const Create: Story = {
  args: {
    initial: emptyInitial(),
    onCancel: () => {},
    onSave: () => {},
  },
}

/** An area with both languages, opened on its Spanish tab. */
export const EditBilingual: Story = {
  args: { ...Create.args, initial: initialFromArea(bilingualArea) },
}

/** No English version yet: the tabs say so, and the photo can change without translating it. */
export const EditLegacy: Story = {
  args: { ...Create.args, initial: initialFromArea(legacyArea) },
}
