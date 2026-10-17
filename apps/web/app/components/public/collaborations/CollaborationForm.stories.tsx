import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { CollaborationForm } from './CollaborationForm'

const meta: Meta<typeof CollaborationForm> = {
  component: CollaborationForm,
  args: { onSave: () => {}, onCancel: () => {} },
}
export default meta
type Story = StoryObj<typeof CollaborationForm>
export const Create: Story = {}
export const Edit: Story = {
  args: {
    collaboration: {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Institute',
      country: 'Italia',
      scope: 'international',
      acronym: 'INST',
      websiteUrl: 'https://example.com',
      editing: {
        content: { es: { country: 'Italia' }, en: { country: 'Italy' } },
        isLegacy: false,
        version: '2026-10-14T12:00:00.000Z',
      },
    },
  },
}
export const Legacy: Story = {
  args: {
    collaboration: {
      ...Edit.args!.collaboration!,
      editing: {
        ...Edit.args!.collaboration!.editing!,
        content: { es: { country: 'Italy' }, en: null },
        isLegacy: true,
      },
    },
  },
}
export const Saving: Story = { args: { ...Edit.args, busy: true } }
