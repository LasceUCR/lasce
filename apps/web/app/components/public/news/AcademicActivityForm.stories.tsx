import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import type { AcademicActivity } from '@/app/lib/academic-activities'
import { emptyInitial, initialFromActivity } from '@/app/lib/academic-activities-form'

import { AcademicActivityForm } from './AcademicActivityForm'

const meta: Meta<typeof AcademicActivityForm> = {
  component: AcademicActivityForm,
  parameters: { layout: 'centered' },
}

export default meta

type Story = StoryObj<typeof AcademicActivityForm>

export const VERSION = '2026-05-24T12:00:00.000Z'

const spanish = {
  title: 'Taller de Clima Espacial',
  category: 'Taller',
  description: 'Descripción del taller, en español.',
  photoAlt: 'Comité y participantes del taller.',
}

const english = {
  title: 'Space Weather Workshop',
  category: 'Workshop',
  description: 'Workshop description, in English.',
  photoAlt: 'Committee and workshop participants.',
}

const spanishActivity: AcademicActivity = {
  id: '00000000-0000-4000-8000-000000000001',
  ...spanish,
  date: '16-20 febrero, 2026',
  startDate: '2026-02-16',
  endDate: '2026-02-20',
  location: 'San José, Costa Rica',
  photoUrl: '/images/mock.jpg',
  contentLocale: 'es',
}

/** An activity with both languages: the Spanish tab opens first, the English one holds its translation. */
export const editableActivity: AcademicActivity = {
  ...spanishActivity,
  editing: { content: { es: spanish, en: english }, isLegacy: false, version: VERSION },
}

/** An activity saved before languages existed: no English row, and its base text's language unknown. */
export const legacyActivity: AcademicActivity = {
  ...spanishActivity,
  id: '00000000-0000-4000-8000-000000000002',
  editing: { content: { es: spanish, en: null }, isLegacy: true, version: VERSION },
}

/** An activity with both languages: the Spanish tab opens first, the English one holds its translation. */
export const EditExisting: Story = {
  args: {
    initial: initialFromActivity(editableActivity),
    onCancel: () => {},
    onSave: () => {},
  },
}

/** A blank form: both languages' text, the dates, the location and the photo are required. */
export const AddNew: Story = {
  args: {
    initial: emptyInitial(),
    onCancel: () => {},
    onSave: () => {},
  },
}

/**
 * An activity saved before languages existed: its base text on the Spanish tab with a note that
 * it may not be Spanish, and an empty English tab flagged as having no translation.
 */
export const Legacy: Story = {
  args: { ...EditExisting.args, initial: initialFromActivity(legacyActivity) },
}

/** The editor follows the site's language: an English interface over the same content. */
export const EnglishInterface: Story = {
  args: EditExisting.args,
  globals: { locale: 'en' },
}

/** A save in flight: every field and button is disabled. */
export const Saving: Story = {
  args: { ...EditExisting.args, busy: true },
}
