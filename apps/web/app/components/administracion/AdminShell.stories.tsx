import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { EditModeProvider } from '@/app/components/public/cms/EditModeProvider'

import { AdminShell } from './AdminShell'

const meta: Meta<typeof AdminShell> = {
  component: AdminShell,
  decorators: [
    (Story) => (
      <EditModeProvider>
        <Story />
      </EditModeProvider>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof AdminShell>

export const Default: Story = {
  args: {
    children: <p>Contenido de la sección</p>,
  },
}
