import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { EditModeProvider } from '@/app/components/public/cms/EditModeProvider'
import { PERMISSIONS } from '@/app/lib/auth/permissions'

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

/** Every grant held: all five sections in the menu. */
export const Default: Story = {
  args: {
    children: <p>Contenido de la sección</p>,
    granted: PERMISSIONS,
  },
}

/** The assistant defaults: Usuarios and Permisos are not offered. */
export const PartialGrants: Story = {
  args: {
    ...Default.args,
    granted: ['edit_components', 'download_resources'],
  },
}

/** No grant at all, as an anonymous visitor: only the public sections remain. */
export const NoGrants: Story = {
  args: {
    ...Default.args,
    granted: [],
  },
}
