import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { AuditTrailPage } from './AuditTrailPage'

const noFilters = { from: '', to: '', actor: '', entityType: '', action: '' }
const options = {
  actors: [{ id: '0a7d5a3e-5a0c-4a55-8a53-4f6b1c0f7a11', name: 'Ana Rodríguez' }],
  entityTypes: ['news', 'user'],
  actions: ['news.create', 'user.role_change'],
}
const window = { pageSize: 10, skip: 0, take: 10 }

const meta: Meta<typeof AuditTrailPage> = {
  component: AuditTrailPage,
  parameters: { layout: 'padded' },
  args: {
    title: 'Auditoría',
    description: 'Consulta quién hizo cada cambio administrativo en el portal y cuándo.',
    pathname: '/administracion/auditoria',
  },
}

export default meta

type Story = StoryObj<typeof AuditTrailPage>

export const WithEvents: Story = {
  args: {
    trail: {
      ...window,
      page: 2,
      totalItems: 23,
      totalPages: 3,
      filters: noFilters,
      options,
      items: [
        {
          id: 'b5b0c6a4-1f39-4c1c-9a0e-6f1b2d3c4e01',
          action: 'news.create',
          summary: 'Noticia agregada: Aurora sobre Costa Rica',
          metadata: null,
          actorType: 'user',
          actorName: 'Ana Rodríguez',
          entityType: 'news',
          occurredAt: '2026-10-16T18:00:00.000Z',
        },
        {
          id: 'b5b0c6a4-1f39-4c1c-9a0e-6f1b2d3c4e02',
          action: 'user.role_change',
          summary: 'Rol de Luis cambiado de Visitante a Asistente',
          metadata: null,
          actorType: 'user',
          actorName: null,
          entityType: 'user',
          occurredAt: '2026-10-15T14:30:00.000Z',
        },
      ],
    },
  },
}

export const Empty: Story = {
  args: {
    trail: {
      ...window,
      page: 1,
      totalItems: 0,
      totalPages: 0,
      filters: noFilters,
      options,
      items: [],
    },
  },
}

export const EmptyWithFilters: Story = {
  args: {
    trail: {
      ...window,
      page: 1,
      totalItems: 0,
      totalPages: 0,
      filters: { ...noFilters, action: 'news.create' },
      options,
      items: [],
    },
  },
}
