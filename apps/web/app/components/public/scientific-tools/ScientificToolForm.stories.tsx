import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ScientificToolForm } from './ScientificToolForm'

const meta: Meta<typeof ScientificToolForm> = {
  component: ScientificToolForm,
  args: {
    onSave: () => {},
    onCancel: () => {},
    onUploadImage: async () =>
      '/api/scientific-tools/images/38300000-0000-4000-8000-000000000009.png',
  },
}

export default meta

type Story = StoryObj<typeof ScientificToolForm>

export const Create: Story = {}

export const Edit: Story = {
  args: {
    tool: {
      id: '38300000-0000-4000-8000-000000000001',
      name: 'SWAAT',
      description: 'Análisis de eventos solares.',
      href: 'https://swaat.up.railway.app/',
      imageUrl: '/images/tools/SWAAT-sun.webp',
      contentLocale: 'es',
      editing: {
        content: {
          es: { description: 'Análisis de eventos solares.' },
          en: { description: 'Analysis of solar events.' },
        },
        isLegacy: false,
        version: '2026-11-13T12:00:00.000Z',
      },
    },
  },
}

export const Legacy: Story = {
  args: {
    tool: {
      ...Edit.args!.tool!,
      contentLocale: null,
      editing: {
        ...Edit.args!.tool!.editing!,
        content: { es: { description: 'Texto original.' }, en: null },
        isLegacy: true,
      },
    },
  },
}

export const Saving: Story = { args: { ...Edit.args, busy: true } }
