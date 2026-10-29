import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { RecentActivityPanel } from './RecentActivityPanel'

const now = new Date('2026-10-16T18:00:00.000Z')

function minutesAgo(minutes: number) {
  return new Date(now.getTime() - minutes * 60_000).toISOString()
}

const meta: Meta<typeof RecentActivityPanel> = {
  component: RecentActivityPanel,
  parameters: {
    layout: 'padded',
  },
}

export default meta

type Story = StoryObj<typeof RecentActivityPanel>

export const Empty: Story = {
  args: {
    items: [],
    now,
  },
}

export const WithActivity: Story = {
  args: {
    now,
    items: [
      {
        id: 'b5b0c6a4-1f39-4c1c-9a0e-6f1b2d3c4e01',
        action: 'publication.create',
        summary: 'Publicación agregada: Solar flares in 2026',
        metadata: null,
        actorType: 'user',
        actorName: 'Ana Rodríguez',
        occurredAt: minutesAgo(12),
      },
      {
        id: 'b5b0c6a4-1f39-4c1c-9a0e-6f1b2d3c4e02',
        action: 'pipeline.complete',
        summary: 'Pipeline SUVI finalizado correctamente',
        metadata: null,
        actorType: 'worker',
        actorName: null,
        occurredAt: minutesAgo(60),
      },
      {
        id: 'b5b0c6a4-1f39-4c1c-9a0e-6f1b2d3c4e03',
        action: 'user.role_change',
        summary: 'Rol actualizado: asistente',
        metadata: null,
        actorType: 'user',
        actorName: null,
        occurredAt: minutesAgo(3 * 60),
      },
      {
        id: 'b5b0c6a4-1f39-4c1c-9a0e-6f1b2d3c4e04',
        action: 'schedule.register',
        summary: 'Tareas programadas registradas',
        metadata: null,
        actorType: 'system',
        actorName: null,
        occurredAt: minutesAgo(2 * 24 * 60),
      },
    ],
  },
}
