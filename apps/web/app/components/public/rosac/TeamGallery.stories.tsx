import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { EditModeContext, EditModeProvider } from '@/app/components/public/cms/EditModeProvider'
import { rosacInfoContent } from '@/app/lib/rosac'

import { TeamGallery } from './TeamGallery'

const meta: Meta<typeof TeamGallery> = {
  component: TeamGallery,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <EditModeProvider>
        <Story />
      </EditModeProvider>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof TeamGallery>

export const Default: Story = {
  args: {
    emptyMessage: rosacInfoContent.team.emptyMessage,
    hint: rosacInfoContent.team.hint,
    label: rosacInfoContent.team.title,
    people: rosacInfoContent.team.people.slice(0, 3),
  },
}

/** One person without a doctoral or engineering title, as the source cards have. */
export const PlainName: Story = {
  args: {
    emptyMessage: rosacInfoContent.team.emptyMessage,
    hint: rosacInfoContent.team.hint,
    label: rosacInfoContent.team.title,
    people: rosacInfoContent.team.people.filter((person) => person.name === 'Jelmuth Rojas'),
  },
}

export const Empty: Story = {
  args: {
    emptyMessage: rosacInfoContent.team.emptyMessage,
    hint: rosacInfoContent.team.hint,
    label: rosacInfoContent.team.title,
    people: [],
  },
}

/** Shows the "Editar"/"Eliminar" affordances the admin's "Modo edición" toggle reveals. */
export const EditMode: Story = {
  args: Default.args,
  decorators: [
    (Story) => (
      <EditModeContext.Provider value={{ editMode: true, setEditMode: () => {} }}>
        <Story />
      </EditModeContext.Provider>
    ),
  ],
}
