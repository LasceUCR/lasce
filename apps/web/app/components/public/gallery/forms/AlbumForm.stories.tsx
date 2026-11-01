import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { AlbumForm } from './AlbumForm'

const album = {
  title: 'Observatorio ROSAC',
  description: 'Instalaciones y equipos del observatorio.',
  yearsLabel: '2019–2023',
  coverObjectKey: '/images/galeria/rosac/8.jpg',
}

const meta: Meta<typeof AlbumForm> = {
  component: AlbumForm,
  parameters: { layout: 'centered' },
  args: { onSave: () => {}, onCancel: () => {} },
}

export default meta

type Story = StoryObj<typeof AlbumForm>

/** Editing an album that has both languages. */
export const Default: Story = {
  args: {
    album,
    stored: {
      es: { title: album.title, description: album.description },
      en: { title: 'ROSAC Observatory', description: 'Observatory facilities and equipment.' },
    },
  },
}

/** Creating an album: the cover and both languages are required, and the title makes the URL. */
export const Create: Story = {
  args: {
    album: { title: '', description: '', yearsLabel: '', coverObjectKey: '' },
    requireSlug: true,
  },
}

/** A legacy record: base text of unknown language, no English version yet. */
export const Legacy: Story = {
  args: {
    ...Default.args,
    isLegacy: true,
    stored: {
      es: { title: album.title, description: album.description },
      en: null,
    },
  },
}

/** A period written by hand before the selects existed: kept as is until a new one is chosen. */
export const UnrecognizedPeriod: Story = {
  args: {
    ...Default.args,
    album: { ...album, yearsLabel: 'primavera 2024' },
  },
}
