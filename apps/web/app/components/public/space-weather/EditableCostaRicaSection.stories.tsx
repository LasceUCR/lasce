import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'

import { EditableCostaRicaSection } from './EditableCostaRicaSection'
import { bilingualSection } from './fixtures'

const meta: Meta<typeof EditableCostaRicaSection> = {
  component: EditableCostaRicaSection,
  parameters: { layout: 'fullscreen', nextjs: { appDirectory: true } },
}

export default meta

type Story = StoryObj<typeof EditableCostaRicaSection>

function withEditMode(editMode: boolean): NonNullable<Story['decorators']> {
  return [
    (Story) => (
      <EditModeContext.Provider value={{ editMode, setEditMode: () => {} }}>
        <Story />
      </EditModeContext.Provider>
    ),
  ]
}

export const ViewMode: Story = {
  args: { section: bilingualSection, canEdit: true },
  decorators: withEditMode(false),
}

/** "Modo edición" for an account with `edit_components`: one pencil on the card, no delete. */
export const EditModeOn: Story = {
  args: { section: bilingualSection, canEdit: true },
  decorators: withEditMode(true),
}

/** Edit mode on, but the account cannot edit: the card stays as visitors see it. */
export const WithoutPermission: Story = {
  args: { section: bilingualSection, canEdit: false },
  decorators: withEditMode(true),
}
