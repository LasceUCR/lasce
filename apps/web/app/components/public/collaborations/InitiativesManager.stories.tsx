import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'
import { InitiativesManager } from './InitiativesManager'
import { Edit } from './InitiativeForm.stories'

const meta: Meta<typeof InitiativesManager> = {
  component: InitiativesManager,
  parameters: { nextjs: { appDirectory: true } },
  decorators: [
    (Story) => (
      <EditModeContext.Provider value={{ editMode: true, setEditMode: () => {} }}>
        <Story />
      </EditModeContext.Provider>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof InitiativesManager>
export const Editable: Story = {
  args: { initiatives: [Edit.args!.initiative!], canCreate: true, canEdit: true, canDelete: true },
}
export const Empty: Story = { args: { ...Editable.args, initiatives: [] } }
export const EditOnly: Story = { args: { ...Editable.args, canCreate: false, canDelete: false } }
export const Public: Story = {
  args: { ...Editable.args, canCreate: false, canEdit: false, canDelete: false },
}
