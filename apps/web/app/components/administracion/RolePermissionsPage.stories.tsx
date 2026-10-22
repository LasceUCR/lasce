import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import en from '@/messages/en.json'

import { permissionRows } from '@/app/lib/access-messages'
import type { Permission } from '@/app/lib/auth/permissions'

import { RolePermissionsPage } from './RolePermissionsPage'

/** Each permission with its label and description, in Spanish. */
const permissions = permissionRows()

const granted: Record<string, readonly Permission[]> = {
  VISITOR: ['download_resources'],
  ASSISTANT: ['edit_components', 'download_resources'],
  ADMIN: [
    'create_components',
    'edit_components',
    'delete_components',
    'download_resources',
    'download_goes_resources',
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

/** The site in English: the page's own text, the roles and the permissions. */
export const English: Story = {
  args: {
    title: en.administration.permissions.title,
    description: en.administration.permissions.description,
    roles: [
      { id: 'VISITOR', name: en.access.roles.VISITOR },
      { id: 'ASSISTANT', name: en.access.roles.ASSISTANT },
      { id: 'ADMIN', name: en.access.roles.ADMIN },
    ],
    permissions: permissionRows(en),
    pendingChanges: 1,
    dirtyPermissionIds: ['edit_components'],
  },
  globals: { locale: 'en' },
}

/** On a phone: the table scrolls sideways and each label keeps its description under it. */
export const Mobile: Story = {
  globals: { viewport: { value: 'permissionsMobile', isRotated: false } },
  parameters: {
    viewport: {
      options: {
        permissionsMobile: {
          name: 'Mobile (390px)',
          styles: { width: '390px', height: '844px' },
        },
      },
    },
  },
}
