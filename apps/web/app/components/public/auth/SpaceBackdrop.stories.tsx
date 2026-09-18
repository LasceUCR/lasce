import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { SpaceBackdrop } from './SpaceBackdrop'

const meta: Meta<typeof SpaceBackdrop> = {
  component: SpaceBackdrop,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <article className="registration-page space-page" style={{ minHeight: 480 }}>
        <Story />
        <header className="page-intro page-width">
          <h1>Acceso al portal</h1>
          <p>Inicia sesión o crea una cuenta para descargar productos científicos.</p>
        </header>
      </article>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof SpaceBackdrop>

export const Default: Story = {}
