import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { collaborationsContent } from '@/app/lib/collaborations'

import { InitiativeDescription } from './InitiativeDescription'

const meta: Meta<typeof InitiativeDescription> = {
  component: InitiativeDescription,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 640 }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof InitiativeDescription>

export const LongDescription: Story = {
  args: { paragraphs: collaborationsContent.initiatives.items[0]!.paragraphs },
}

export const MultipleParagraphs: Story = {
  args: { paragraphs: collaborationsContent.initiatives.items[1]!.paragraphs },
}

export const Expanded: Story = {
  args: MultipleParagraphs.args,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button'))
  },
}

export const ShortDescription: Story = {
  args: { paragraphs: ['Una iniciativa internacional para el estudio del clima espacial.'] },
}
