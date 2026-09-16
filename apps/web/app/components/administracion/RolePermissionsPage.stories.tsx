import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import type { Permission } from '@/app/lib/auth/permissions'

import { RolePermissionsPage } from './RolePermissionsPage'

const permissions: Array<{
  id: Permission
  label: string
  description: string
  checked: boolean
  locked: boolean
}> = [
  {
    id: 'create_components',
    label: 'Crear componentes',
    description: 'Crear componentes del portal cuando esa función esté disponible.',
    checked: true,
    locked: false,
  },
  {
    id: 'edit_components',
    label: 'Editar componentes',
    description: 'Editar componentes del portal cuando esa función esté disponible.',
    checked: true,
    locked: false,
  },
  {
    id: 'download_resources',
    label: 'Descargar recursos',
    description: 'Descargar recursos y consultar el historial de descargas.',
    checked: true,
    locked: false,
  },
  {
    id: 'manage_permissions',
    label: 'Configurar permisos',
    description: 'Ver y cambiar los permisos asociados a cada rol.',
    checked: true,
    locked: true,
  },
]

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
    selectedRoleId: 'ADMIN',
    permissions,
    onSelectRole: () => undefined,
    onTogglePermission: () => undefined,
    onSave: async () => undefined,
  },
}

export default meta

type Story = StoryObj<typeof RolePermissionsPage>

export const Default: Story = {}

export const Visitor: Story = {
  args: {
    selectedRoleId: 'VISITOR',
    permissions: permissions.map((permission) => ({
      ...permission,
      checked: permission.id === 'download_resources',
      locked: false,
    })),
  },
}

export const ErrorState: Story = {
  args: {
    error: 'La información de este rol cambió. Recarga la página antes de volver a guardarlo.',
  },
}

export const Saved: Story = {
  args: {
    status: 'Permisos actualizados para Persona administradora.',
    canSave: false,
  },
}
