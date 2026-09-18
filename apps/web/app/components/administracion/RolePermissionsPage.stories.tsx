import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import type { Permission } from '@/app/lib/auth/permissions'
import { PERMISSION_LABELS, PERMISSIONS } from '@/app/lib/auth/permissions'

import { RolePermissionsPage } from './RolePermissionsPage'

const permissions = PERMISSIONS.map((id) => ({
  id,
  label: PERMISSION_LABELS[id],
}))

const granted: Record<string, readonly Permission[]> = {
  VISITOR: ['download_resources'],
  ASSISTANT: ['edit_components', 'download_resources'],
  ADMIN: [
    'create_components',
    'edit_components',
    'delete_components',
    'download_resources',
    'manage_users',
    'manage_permissions',
  ],
}

const meta: Meta<typeof RolePermissionsPage> = {
  component: RolePermissionsPage,
  args: {
    title: 'Permisos',
    description: 'Configura los permisos asociados a cada rol del sistema.',
    roles: [
      { id: 'VISITOR', name: 'Visitante' },
      { id: 'ASSISTANT', name: 'Asistente' },
      { id: 'ADMIN', name: 'Persona administradora' },
    ],
    permissions,
    granted,
    lockedRoleIds: ['ADMIN'],
    onTogglePermission: () => undefined,
    onSave: async () => undefined,
  },
}

export default meta

type Story = StoryObj<typeof RolePermissionsPage>

export const Default: Story = {}

export const ErrorState: Story = {
  args: {
    error: 'La información de este rol cambió. Recarga la página antes de volver a guardarlo.',
  },
}

export const Saved: Story = {
  args: {
    status: 'Permisos actualizados para Asistente.',
    canSave: false,
  },
}

export const PendingChanges: Story = {
  args: {
    pendingChanges: 2,
    canSave: true,
    dirtyPermissionIds: ['edit_components', 'manage_permissions'],
  },
}
