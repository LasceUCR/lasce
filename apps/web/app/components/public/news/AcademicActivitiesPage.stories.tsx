import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { EditModeContext, EditModeProvider } from '@/app/components/public/cms/EditModeProvider'

import { AcademicActivitiesPage } from './AcademicActivitiesPage'
import { mockActivity } from './AcademicActivityCard.stories'

const meta: Meta<typeof AcademicActivitiesPage> = {
  component: AcademicActivitiesPage,
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

type Story = StoryObj<typeof AcademicActivitiesPage>

export const Default: Story = {
  args: {
    activities: [mockActivity],
  },
}

export const Empty: Story = {
  args: {
    activities: [],
  },
}

/** Shows the edit/delete affordances and the "Agregar actividad" card the admin toggle reveals. */
export const EditMode: Story = {
  args: { ...Default.args, canCreate: true, canEdit: true, canDelete: true },
  decorators: [
    (Story) => (
      <EditModeContext.Provider value={{ editMode: true, setEditMode: () => {} }}>
        <Story />
      </EditModeContext.Provider>
    ),
  ],
}
