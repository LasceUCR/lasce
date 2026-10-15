import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'
import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import { CollaborationsManager } from './CollaborationsManager'
import { Edit } from './CollaborationForm.stories'

const meta: Meta<typeof CollaborationsManager> = {
  component: CollaborationsManager,
  parameters: { nextjs: { appDirectory: true } },
  decorators: [
    (Story) => (
      <ToastProvider>
        <EditModeContext.Provider value={{ editMode: true, setEditMode: () => {} }}>
          <Story />
        </EditModeContext.Provider>
      </ToastProvider>
    ),
  ],
  args: {
    collaborations: [Edit.args!.collaboration!],
    canCreate: true,
    canEdit: true,
    canDelete: true,
  },
}
export default meta
type Story = StoryObj<typeof CollaborationsManager>
export const Editable: Story = { args: meta.args }
export const Empty: Story = { args: { collaborations: [] } }
export const ReadOnly: Story = { args: { canCreate: false, canEdit: false, canDelete: false } }
