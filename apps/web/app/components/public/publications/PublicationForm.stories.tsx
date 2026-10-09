import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { emptyInitial, initialFromPublication } from '@/app/lib/publication-form'
import type { Publication } from '@/app/lib/publication-schema'

import { PublicationForm } from './PublicationForm'

const bilingualPublication: Publication = {
  slug: '0b6f2a52-3f4c-4a43-9a52-8f7d2b1e9c10',
  title: 'Actividad solar y clima espacial',
  authors: ['Juan Pérez', 'María Rodríguez', 'Carlos González'],
  venue: 'Astrophysical Journal',
  year: '2026',
  date: new Date('2026-09-17'),
  abstract:
    'Este estudio analiza la actividad solar y su relación con los fenómenos de clima espacial observados durante el periodo de estudio.',
  href: 'https://ieeexplore.ieee.org/abstract/document/10933895',
  DOI: '10.1109/CONCAPAN63470.2024.10933895',
  researchGroup: 'LASCE',
  contentLocale: 'es',
  editing: {
    content: {
      es: {
        title: 'Actividad solar y clima espacial',
        abstract:
          'Este estudio analiza la actividad solar y su relación con los fenómenos de clima espacial observados durante el periodo de estudio.',
      },
      en: {
        title: 'Solar Activity and Space Weather',
        abstract:
          'This study analyzes solar activity and its relationship with space weather phenomena observed during the study period.',
      },
    },
    isLegacy: false,
    version: '2026-09-17T15:00:00.000Z',
  },
}

/** Saved before languages existed: its base text is English and it has no translation row. */
const legacyPublication: Publication = {
  ...bilingualPublication,
  slug: '5a1d6f0e-2c47-4f7b-8d3e-0c9b1a2e4f60',
  title: 'Non-thermal electrons in an eruptive solar flare',
  abstract: 'We study the non-thermal electrons accelerated during an eruptive flare.',
  contentLocale: null,
  editing: {
    content: {
      es: {
        title: 'Non-thermal electrons in an eruptive solar flare',
        abstract: 'We study the non-thermal electrons accelerated during an eruptive flare.',
      },
      en: null,
    },
    isLegacy: true,
    version: '2024-07-30T12:00:00.000Z',
  },
}

const meta: Meta<typeof PublicationForm> = {
  component: PublicationForm,
  parameters: { layout: 'centered' },
}

export default meta

type Story = StoryObj<typeof PublicationForm>

/** Editing a publication that has both languages. */
export const Default: Story = {
  args: {
    initial: initialFromPublication(bilingualPublication),
    onCancel: () => {},
    onSave: () => {},
  },
}

/** Creating a publication: all four texts are required. */
export const Create: Story = {
  args: {
    ...Default.args,
    initial: emptyInitial(new Date('2026-10-08T12:00:00')),
    confirmTitle: 'Agregar publicación',
    confirmMessage: '¿Desea agregar esta publicación?',
  },
}

/** A legacy record: base text of unknown language, no English version yet. */
export const Legacy: Story = {
  args: {
    ...Default.args,
    initial: initialFromPublication(legacyPublication),
  },
}

/** After the server rejected the last save. */
export const ServerErrors: Story = {
  args: {
    ...Default.args,
    serverErrors: {
      'content.en.title': 'El título en inglés es obligatorio.',
      DOI: 'Ya existe una publicación con este DOI.',
    },
  },
}
