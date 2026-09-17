import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { EditModeContext, EditModeProvider } from '@/app/components/public/cms/EditModeProvider'
import { nosotrosContent } from '@/app/lib/nosotros'

import { NosotrosPage } from './NosotrosPage'

const meta: Meta<typeof NosotrosPage> = {
  component: NosotrosPage,
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

type Story = StoryObj<typeof NosotrosPage>

export const Default: Story = {
  args: { content: nosotrosContent },
}

/**
 * The banner the page carried while the copy was provisional. LASCE has approved the text, so
 * `nosotrosContent` no longer sets `flag`; this keeps the branch exercised for the next revision.
 */
export const ProvisionalCopy: Story = {
  args: {
    content: {
      ...nosotrosContent,
      flag: {
        label: 'Información provisional',
        message: 'El contenido de esta página está pendiente de revisión.',
      },
    },
  },
}

/** Shows the empty-gallery message when LASCE has not supplied people to list. */
export const EmptyResearchers: Story = {
  args: {
    content: {
      ...nosotrosContent,
      researchers: { ...nosotrosContent.researchers, people: [] },
    },
  },
}

/** Shows every editor an administrator's "Modo edición" toggle reveals. */
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

/** Assistant defaults: pencil only — no Añadir and no trash. */
export const AssistantEditMode: Story = {
  args: { ...Default.args, canCreate: false, canEdit: true, canDelete: false },
  decorators: EditMode.decorators,
}

export const Mobile: Story = {
  args: Default.args,
  globals: { viewport: { value: 'nosotrosMobile', isRotated: false } },
  parameters: {
    viewport: {
      options: {
        nosotrosMobile: {
          name: 'Mobile (390px)',
          styles: { width: '390px', height: '844px' },
        },
      },
    },
  },
}