import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { LanguageSwitcher } from './LanguageSwitcher'

const meta: Meta<typeof LanguageSwitcher> = {
  component: LanguageSwitcher,
}

export default meta

type Story = StoryObj<typeof LanguageSwitcher>

export const Default: Story = {
  args: {
    label: 'Idioma',
    locale: 'es',
    options: [
      { value: 'es', label: 'Español' },
      { value: 'en', label: 'English' },
    ],
    onChange: () => undefined,
  },
}

export const English: Story = {
  args: { ...Default.args, label: 'Language', locale: 'en' },
}

// While the Server Action that stores the choice is running.
export const Changing: Story = {
  args: { ...Default.args, disabled: true },
}
