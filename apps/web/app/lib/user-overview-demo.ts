import type { OverviewRole, OverviewUser } from './user-overview'

// Fictional users and assignments with the agreed role names for the overview prototype.
export const demoRoles: OverviewRole[] = [
  {
    id: 'demo-visitor',
    name: 'Visitante',
    description: 'Puede visitar la página y descargar contenido.',
  },
  {
    id: 'demo-assistant',
    name: 'Asistente',
    description: 'Puede editar el contenido de la página.',
  },
  {
    id: 'demo-admin',
    name: 'Administrador',
    description:
      'Tiene acceso a todas las funciones del panel administrativo, incluida la asignación y revocación de roles y la edición de contenido.',
  },
]

export const demoUsers: OverviewUser[] = [
  {
    id: 'demo-1',
    name: 'Ana Ejemplo',
    email: 'ana@example.com',
    institution: 'Universidad de Costa Rica',
    country: 'Costa Rica',
    roleIds: ['demo-admin'],
  },
  {
    id: 'demo-2',
    name: 'Luis Ejemplo',
    email: 'luis@example.com',
    institution: 'Universidad de Costa Rica',
    country: 'Costa Rica',
    roleIds: ['demo-assistant'],
  },
  {
    id: 'demo-3',
    name: 'María Ejemplo',
    email: 'maria@example.com',
    institution: 'Universidad de Panamá',
    country: 'Panamá',
    roleIds: ['demo-visitor'],
  },
  {
    id: 'demo-4',
    name: 'Carlos Ejemplo',
    email: 'carlos@example.com',
    institution: '',
    country: '',
    roleIds: [],
  },
]
