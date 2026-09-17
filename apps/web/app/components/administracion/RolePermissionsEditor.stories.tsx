import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { DEFAULT_ROLE_PERMISSIONS } from '@/app/lib/auth/permissions'

import { RolePermissionsEditor } from './RolePermissionsEditor'

const meta: Meta<typeof RolePermissionsEditor> = {
  component: RolePermissionsEditor,
  args: {
    title: 'Permisos',
    description: 'Configura los permisos asociados a cada rol del sistema.',
    roles: [
      { id: 'VISITOR', name: 'Visitante' },
      { id: 'ASSISTANT', name: 'Asistente' },
      { id: 'ADMIN', name: 'Persona administradora' },
    ],
    matrix: {
      VISITOR: [...DEFAULT_ROLE_PERMISSIONS.VISITOR],
      ASSISTANT: [...DEFAULT_ROLE_PERMISSIONS.ASSISTANT],
      ADMIN: [...DEFAULT_ROLE_PERMISSIONS.ADMIN],
    },
    saveAction: async ({ permissions }) => ({ ok: true, permissions }),
  },
}

export default meta

type Story = StoryObj<typeof RolePermissionsEditor>

export const Default: Story = {}

export const SaveFailure: Story = {
  args: { saveAction: async () => ({ ok: false, reason: 'conflict' }) },
}
