import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { PublicationForm } from './PublicationForm'

const meta: Meta<typeof PublicationForm> = {
  component: PublicationForm,
  parameters: { layout: 'centered' },
}

export default meta

type Story = StoryObj<typeof PublicationForm>

export const Default: Story = {
  args: {
    publication: {
      title: 'Solar Activity and Space Weather',
      authors: ['Juan Pérez', 'María Rodríguez', 'Carlos González'],
      venue: 'Astrophysical Journal',
      date: new Date('2026-09-17'),
      DOI: 'google.com',
      abstract:
        'This study analyzes solar activity and its relationship with space weather phenomena observed during the study period.',
      researchGroup: 'LASCE',
    },
    onCancel: () => {},
    onSave: () => {},
  },
}
