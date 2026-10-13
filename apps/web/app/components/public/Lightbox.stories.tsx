import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { Lightbox } from './Lightbox'

const meta: Meta<typeof Lightbox> = {
  component: Lightbox,
  parameters: { layout: 'fullscreen' },
}

export default meta

type Story = StoryObj<typeof Lightbox>

export const Default: Story = {
  args: {
    labelledBy: 'lightbox-story-title',
    describedBy: 'lightbox-story-description',
    position: 2,
    total: 5,
    positionLabel: 'Elemento 2 de 5',
    announcement: 'Elemento 2 de 5: Segundo.',
    labels: { close: 'Cerrar', previous: 'Anterior', next: 'Siguiente' },
    onClose: () => {},
    onPrevious: () => {},
    onNext: () => {},
    children: (
      <figure className="lightbox-stage">
        <figcaption className="lightbox-meta">
          <h2 id="lightbox-story-title">Segundo</h2>
          <p id="lightbox-story-description">Contenido de ejemplo del visor.</p>
        </figcaption>
      </figure>
    ),
  },
}

/** First item, so the indicator is seen at the start. */
export const FirstItem: Story = {
  args: { ...Default.args, position: 1, positionLabel: 'Elemento 1 de 5' },
}
