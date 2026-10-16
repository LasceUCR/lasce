import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { indicatorInitial } from '@/app/lib/home-form'

import { editableIndicators } from './fixtures'
import { IndicatorForm } from './IndicatorForm'

const dst = editableIndicators[1]!

const meta: Meta<typeof IndicatorForm> = {
  component: IndicatorForm,
}

export default meta

type Story = StoryObj<typeof IndicatorForm>

export const Bilingual: Story = {
  args: {
    initial: indicatorInitial(dst.editing!),
    onSave: () => {},
    onCancel: () => {},
  },
}

/** An index without its English description: a value-only edit still saves. */
export const Legacy: Story = {
  args: {
    ...Bilingual.args,
    initial: indicatorInitial({
      ...dst.editing!,
      content: { es: { description: 'Estable' }, en: null },
      isLegacy: true,
    }),
  },
}
