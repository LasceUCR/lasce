import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { LanguageMenu } from './LanguageMenu'

const meta: Meta<typeof LanguageMenu> = {
  component: LanguageMenu,
  // The trigger stretches to the header row it normally sits in, and the panel hangs below it.
  decorators: [
    (Story) => (
      <div style={{ height: 63, display: 'flex', justifyContent: 'center', marginBottom: 120 }}>
        <Story />
      </div>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof LanguageMenu>

export const Default: Story = {
  args: {
    label: 'Idioma',
    locale: 'es',
    options: [
      { value: 'es', label: 'Español', shortLabel: 'ES' },
      { value: 'en', label: 'English', shortLabel: 'EN' },
    ],
    onChange: () => undefined,
  },
}

export const Open: Story = {
  args: { ...Default.args, defaultOpen: true },
}

export const English: Story = {
  args: { ...Default.args, label: 'Language', locale: 'en', defaultOpen: true },
}

// While the Server Action that stores the choice is running.
export const Changing: Story = {
  args: { ...Default.args, defaultOpen: true, disabled: true },
}
