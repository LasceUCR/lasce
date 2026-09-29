import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'
import type { NewsArticle } from '@/app/lib/news'

import { EditableNewsCard } from './EditableNewsCard'

const meta: Meta<typeof EditableNewsCard> = {
  component: EditableNewsCard,
  parameters: {
    layout: 'centered',
  },
}

export default meta

type Story = StoryObj<typeof EditableNewsCard>

const mockArticle: NewsArticle = {
  slug: 'mock-slug',
  title:
    '¿Cómo que aquí no pasa nada? Cinco proyectos científicos para entusiasmarse en Costa Rica',
  authors: 'Jorge Arturo Mora',
  source: 'La Nación – Revista Dominical',
  date: '24 de mayo de 2026',
  publishedAt: '2026-05-24',
  abstract:
    'Reportaje sobre proyectos científicos costarricenses, entre ellos ROSAC, el radiotelescopio de la Universidad de Costa Rica dedicado al estudio de la actividad solar.',
  href: 'https://www.nacion.com/revista-dominical/como-que-aqui-no-pasa-nada-cinco-proyectos/CZAKRKAEDJE7DPTMVO52LFBZQQ/story/',
  imageUrl: '/images/news/la-nacion-1.png',
  imageAlt:
    'Proyectos científicos de vanguardia para Costa Rica en el Centro Nacional de Alta Tecnología.',
}

export const ViewMode: Story = {
  args: {
    article: mockArticle,
    onDelete: () => {},
    onSave: async () => null,
  },
  decorators: [
    (Story) => (
      <EditModeContext.Provider value={{ editMode: false, setEditMode: () => {} }}>
        <Story />
      </EditModeContext.Provider>
    ),
  ],
}

export const EditModeOn: Story = {
  args: {
    article: mockArticle,
    canEdit: true,
    canDelete: true,
    onDelete: () => {},
    onSave: async () => null,
  },
  decorators: [
    (Story) => (
      <EditModeContext.Provider value={{ editMode: true, setEditMode: () => {} }}>
        <Story />
      </EditModeContext.Provider>
    ),
  ],
}

/** An assistant account: `edit_components` but not `delete_components` — only the pencil shows. */
export const AssistantMode: Story = {
  args: {
    article: mockArticle,
    canEdit: true,
    canDelete: false,
    onDelete: () => {},
    onSave: async () => null,
  },
  decorators: [
    (Story) => (
      <EditModeContext.Provider value={{ editMode: true, setEditMode: () => {} }}>
        <Story />
      </EditModeContext.Provider>
    ),
  ],
}
