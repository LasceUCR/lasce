import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'

import { EditableLasceSection } from './EditableLasceSection'
import { bilingualSection } from './LasceSectionForm.stories'

const meta: Meta<typeof EditableLasceSection> = {
  component: EditableLasceSection,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <EditModeContext.Provider value={{ editMode: true, setEditMode: () => {} }}>
        <Story />
      </EditModeContext.Provider>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof EditableLasceSection>

/** "Modo edición" is on and the viewer may edit: the section shows its Edit button. */
export const Editor: Story = {
  args: { section: bilingualSection, canEdit: true },
}

/** The viewer may not edit: the section is read-only even with "Modo edición" on. */
export const ReadOnly: Story = {
  args: { section: bilingualSection, canEdit: false },
}
