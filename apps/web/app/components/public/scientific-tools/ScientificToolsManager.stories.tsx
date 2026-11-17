import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'
import { ScientificToolsManager } from './ScientificToolsManager'
import { Edit } from './ScientificToolForm.stories'

const meta: Meta<typeof ScientificToolsManager> = {
  component: ScientificToolsManager,
  parameters: { layout: 'padded', nextjs: { appDirectory: true } },
}

export default meta

type Story = StoryObj<typeof ScientificToolsManager>

const swaat = Edit.args!.tool!
const swapro = {
  ...swaat,
  id: '38300000-0000-4000-8000-000000000002',
  name: 'SWAPRO',
  description: 'Consulta y visualización de eventos solares.',
  href: 'https://swapro.up.railway.app/',
  imageUrl: null,
  editing: {
    ...swaat.editing!,
    content: {
      es: { description: 'Consulta y visualización de eventos solares.' },
      en: { description: 'Querying and visualisation of solar events.' },
    },
  },
}

/** What a visitor sees. */
export const Default: Story = { args: { tools: [swaat, swapro] } }

export const Empty: Story = { args: { tools: [] } }

/** Modo edición, for an account that holds every grant. */
export const Editable: Story = {
  args: { ...Default.args, canCreate: true, canEdit: true, canDelete: true },
  decorators: [
    (Story) => (
      <EditModeContext.Provider value={{ editMode: true, setEditMode: () => {} }}>
        <Story />
      </EditModeContext.Provider>
    ),
  ],
}

export const EditableEmpty: Story = { ...Editable, args: { ...Editable.args, tools: [] } }
