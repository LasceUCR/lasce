import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import type { NosotrosActivityEditingData } from '@/app/lib/nosotros-activity-schema'

import { NosotrosActivityForm } from './NosotrosActivityForm'

const bilingualActivity: NosotrosActivityEditingData = {
  content: {
    es: {
      title: 'Fenómenos solares eruptivos',
      description:
        "Analizamos fenómenos solares eruptivos, como 'flares', eyecciones de masa coronal (CMEs, por sus siglas en inglés) y emisiones solares de radio.",
    },
    en: {
      title: 'Eruptive solar phenomena',
      description:
        'We analyze eruptive solar phenomena, such as flares, coronal mass ejections (CMEs) and solar radio emissions.',
    },
  },
  isLegacy: false,
  version: '2026-09-17T15:00:00.000Z',
}

/** Saved before languages existed: its base text is English and it has no translation row. */
const legacyActivity: NosotrosActivityEditingData = {
  content: {
    es: {
      title: 'Eruptive solar phenomena',
      description: 'We analyze eruptive solar phenomena, such as flares and CMEs.',
    },
    en: null,
  },
  isLegacy: true,
  version: '2024-07-30T12:00:00.000Z',
}

const meta: Meta<typeof NosotrosActivityForm> = {
  component: NosotrosActivityForm,
  parameters: { layout: 'centered' },
}

export default meta

type Story = StoryObj<typeof NosotrosActivityForm>

/** Editing a card that has both languages. */
export const Default: Story = {
  args: {
    editing: bilingualActivity,
    icon: 'sun',
    onCancel: () => {},
    onSave: () => {},
  },
}

/** A blank form for a new card. "Confirmar" saves straight away, with no confirmation dialog. */
export const Create: Story = {
  args: {
    editing: null,
    icon: 'sun',
    requireConfirmation: false,
    onCancel: () => {},
    onSave: () => {},
  },
}

/** A card with no English version: both languages must be completed to change its text. */
export const Legacy: Story = {
  args: {
    ...Default.args,
    editing: legacyActivity,
  },
}
