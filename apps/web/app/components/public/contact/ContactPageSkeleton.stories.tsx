import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { contactContent } from '@/app/lib/contact'

import { ContactPageSkeleton } from './ContactPageSkeleton'

const meta: Meta<typeof ContactPageSkeleton> = {
  component: ContactPageSkeleton,
  parameters: { layout: 'fullscreen' },
}
export default meta

type Story = StoryObj<typeof ContactPageSkeleton>

export const Default: Story = {
  args: { content: contactContent, label: 'Cargando contacto…' },
}
