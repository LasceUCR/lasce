import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'

import { EditableHomeHero } from './EditableHomeHero'
import { bilingualHero } from './fixtures'

const meta: Meta<typeof EditableHomeHero> = {
  component: EditableHomeHero,
  parameters: { nextjs: { appDirectory: true } },
  decorators: [
    (Story) => (
      <section className="hero">
        <div className="hero-content page-width">
          <Story />
        </div>
      </section>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof EditableHomeHero>

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
  args: { hero: bilingualHero, canEdit: true },
  decorators: withEditMode(false),
}

/** "Modo edición" for an account with `edit_components`: one pencil, no delete. */
export const EditModeOn: Story = {
  args: { hero: bilingualHero, canEdit: true },
  decorators: withEditMode(true),
}

/** Edit mode on, but the account cannot edit: the banner stays as visitors see it. */
export const WithoutPermission: Story = {
  args: { hero: bilingualHero, canEdit: false },
  decorators: withEditMode(true),
}
