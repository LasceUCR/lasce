import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { contactContent } from '@/app/lib/contact'

import { ContactPage } from './ContactPage'

const meta: Meta<typeof ContactPage> = {
  component: ContactPage,
  parameters: { layout: 'fullscreen' },
}

export default meta

type Story = StoryObj<typeof ContactPage>

export const Default: Story = {
  args: { content: contactContent },
}

export const OmitsIncompleteChannels: Story = {
  args: {
    content: {
      ...contactContent,
      channels: [
        ...contactContent.channels,
        { id: 'email', label: 'Correo electrónico', value: ' ', href: 'mailto:' },
        { id: 'fax', label: 'Fax', value: 'Por definir' },
      ],
    },
  },
}
