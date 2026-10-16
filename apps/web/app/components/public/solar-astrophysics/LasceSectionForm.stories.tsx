import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { initialFromSection } from '@/app/lib/solar-physics-section-form'
import type { SolarPhysicsSection } from '@/app/lib/solar-physics-section-schema'

import { LasceSectionForm } from './LasceSectionForm'

/** Both languages stored, as an editor receives it. */
export const bilingualSection: SolarPhysicsSection = {
  title: 'El trabajo de LASCE en Física Solar',
  paragraphs: ['Primer párrafo.', 'Segundo párrafo.'],
  contentLocale: 'es',
  editing: {
    content: {
      es: {
        title: 'El trabajo de LASCE en Física Solar',
        body: 'Primer párrafo.\n\nSegundo párrafo.',
      },
      en: {
        title: "LASCE's work in solar physics",
        body: 'First paragraph.\n\nSecond paragraph.',
      },
    },
    isLegacy: false,
    version: '2026-10-14T15:00:00.000Z',
  },
}

/** Saved before languages existed: its base text is English and it has no translation row. */
export const legacySection: SolarPhysicsSection = {
  title: "LASCE's work in solar physics",
  paragraphs: ['First paragraph.'],
  contentLocale: null,
  editing: {
    content: {
      es: { title: "LASCE's work in solar physics", body: 'First paragraph.' },
      en: null,
    },
    isLegacy: true,
    version: '2024-07-30T12:00:00.000Z',
  },
}

const meta: Meta<typeof LasceSectionForm> = {
  component: LasceSectionForm,
  parameters: { layout: 'centered' },
}

export default meta

type Story = StoryObj<typeof LasceSectionForm>

/** Editing a section that has both languages. */
export const Default: Story = {
  args: {
    initial: initialFromSection(bilingualSection) ?? undefined,
    onCancel: () => {},
    onSave: () => {},
  },
}

/** A legacy section: base text of unknown language, no English version yet. */
export const Legacy: Story = {
  args: {
    ...Default.args,
    initial: initialFromSection(legacySection) ?? undefined,
  },
}

/** After the server rejected the last save. */
export const ServerErrors: Story = {
  args: {
    ...Default.args,
    serverErrors: {
      'content.en.title': 'El título en inglés es obligatorio.',
      'content.es.body': 'El texto en español no puede superar 5000 caracteres.',
    },
  },
}
