import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { nosotrosContent } from '@/app/lib/nosotros'

import { NosotrosPage } from './NosotrosPage'

const meta: Meta<typeof NosotrosPage> = {
  component: NosotrosPage,
  parameters: { layout: 'fullscreen' },
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
