import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'

import { TranslationReview, type TranslationReviewProps } from './TranslationReview'

const meta: Meta<typeof TranslationReview> = {
  component: TranslationReview,
}

export default meta

type Story = StoryObj<typeof TranslationReview>

function InteractiveTranslationReview(props: TranslationReviewProps) {
  const [checked, setChecked] = useState(props.checked)
  return (
    <TranslationReview
      {...props}
      checked={checked}
      onChange={(next) => {
        setChecked(next)
        props.onChange(next)
      }}
    />
  )
}

/** A fictitious event whose description changed in English only. */
export const Pending: Story = {
  args: {
    message:
      'Cambió la descripción en inglés. Actualice la descripción en español o confirme que sigue siendo correcta.',
    label: 'La descripción en español sigue siendo correcta',
    checked: false,
    onChange: () => {},
  },
  render: (args) => <InteractiveTranslationReview {...args} />,
}

export const Confirmed: Story = {
  args: { ...Pending.args, checked: true },
  render: (args) => <InteractiveTranslationReview {...args} />,
}
