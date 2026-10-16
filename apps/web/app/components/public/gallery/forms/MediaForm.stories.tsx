import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { MediaForm } from './MediaForm'

const media = {
  id: 'media-1',
  title: 'Antena del observatorio',
  description: 'Vista general de la antena al amanecer.',
  alt: 'Antena parabólica frente a un cielo despejado',
  date: '2024-03-12',
  colSpan: '2',
  rowSpan: '1',
  src: '/images/galeria/rosac/8.jpg',
  format: 'JPG',
}

const meta: Meta<typeof MediaForm> = {
  component: MediaForm,
  parameters: { layout: 'centered' },
  args: { albumId: 'album-1', uploader: 'Ana Mora', onSaved: () => {}, onCancel: () => {} },
}

export default meta

type Story = StoryObj<typeof MediaForm>

/** Editing a file that has both languages. */
export const Default: Story = {
  args: {
    media,
    version: '2024-03-12T15:00:00.000Z',
    stored: {
      es: { title: media.title, description: media.description, altText: media.alt },
      en: {
        title: 'Observatory antenna',
        description: 'General view of the antenna at sunrise.',
        altText: 'Dish antenna against a clear sky',
      },
    },
  },
}

/** Adding a file: the image and all three texts in both languages are required. */
export const Create: Story = {}

/** A legacy record: base text of unknown language, no English version yet. */
export const Legacy: Story = {
  args: {
    ...Default.args,
    isLegacy: true,
    stored: {
      es: { title: media.title, description: media.description, altText: media.alt },
      en: null,
    },
  },
}
