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

/** Shows the "Editar" affordance the admin's "Modo edición" toggle reveals. */
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
