import type { OverviewRole, OverviewUser } from './user-overview'

// Fictional users and assignments with the agreed role names for the overview prototype.
export const demoRoles: OverviewRole[] = [
  { id: 'demo-visitor', name: 'Visitante' },
  { id: 'demo-assistant', name: 'Asistente' },
  { id: 'demo-admin', name: 'Administrador' },
]

export const demoUsers: OverviewUser[] = [
  {
    id: 'demo-1',
    name: 'Ana Ejemplo',
    email: 'ana@example.com',
    institution: 'Universidad de Costa Rica',
    country: 'Costa Rica',
    roleIds: ['demo-admin', 'demo-assistant'],
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
