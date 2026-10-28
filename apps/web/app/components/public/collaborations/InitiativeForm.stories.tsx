import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { InitiativeForm } from './InitiativeForm'

const meta: Meta<typeof InitiativeForm> = {
  component: InitiativeForm,
  args: { onSave: () => {}, onCancel: () => {} },
}
export default meta
type Story = StoryObj<typeof InitiativeForm>
export const Create: Story = {}
export const Edit: Story = {
  args: {
    initiative: {
      id: '01200000-0000-4000-8000-000000000003',
      title: 'Iniciativa de prueba',
      paragraphs: ['Descripción de prueba.'],
      href: 'https://example.com',
      contentLocale: 'es',
      editing: {
        content: {
          es: { title: 'Iniciativa de prueba', description: 'Descripción de prueba.' },
          en: { title: 'Test initiative', description: 'Test description.' },
        },
        isLegacy: false,
        version: '2026-10-27T12:00:00.000Z',
      },
    },
  },
}
export const Legacy: Story = {
  args: {
    initiative: {
      ...Edit.args!.initiative!,
      editing: {
        ...Edit.args!.initiative!.editing!,
        content: { es: { title: 'Legacy title', description: 'Original text.' }, en: null },
        isLegacy: true,
      },
    },
  },
}
export const Saving: Story = { args: { ...Edit.args, busy: true } }
