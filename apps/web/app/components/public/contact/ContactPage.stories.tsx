import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { EditModeProvider } from '@/app/components/public/cms/EditModeProvider'
import { contactContent } from '@/app/lib/contact'
import type { ContactCard } from '@/app/lib/contact-channel-schema'

import { ContactPage } from './ContactPage'

/** The two cards the migration seeds, so stories and tests do not need a database. */
const sampleContactCards: ContactCard[] = [
  {
    id: '6c8e1a20-7b4d-4e1a-9c3f-1a2b3c4d5e01',
    icon: 'phone',
    title: 'Teléfono',
    description: '2511-6566',
    href: null,
    lang: undefined,
    editing: null,
  },
  {
    id: '6c8e1a20-7b4d-4e1a-9c3f-1a2b3c4d5e02',
    icon: 'instagram',
    title: 'Instagram',
    description: '@lasce_ucr',
    href: 'https://www.instagram.com/lasce_ucr/',
    lang: undefined,
    editing: null,
  },
]

const meta: Meta<typeof ContactPage> = {
  component: ContactPage,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <EditModeProvider>
        <Story />
      </EditModeProvider>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof ContactPage>

export const Default: Story = {
  args: { content: contactContent, cards: sampleContactCards },
}

export const OmitsIncompleteChannels: Story = {
  args: {
    content: contactContent,
    cards: [
      ...sampleContactCards,
      {
        id: '6c8e1a20-7b4d-4e1a-9c3f-1a2b3c4d5e03',
        icon: 'email',
        title: 'Correo electrónico',
        description: ' ',
        href: null,
        lang: undefined,
        editing: null,
      },
      {
        id: '6c8e1a20-7b4d-4e1a-9c3f-1a2b3c4d5e04',
        icon: 'location',
        title: 'Fax',
        description: 'Por definir',
        href: null,
        lang: undefined,
        editing: null,
      },
    ],
  },
}
