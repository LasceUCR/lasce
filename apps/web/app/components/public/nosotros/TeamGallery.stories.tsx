import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { nosotrosContent } from '@/app/lib/nosotros'

import { TeamGallery } from './TeamGallery'

const meta: Meta<typeof TeamGallery> = {
  component: TeamGallery,
  parameters: { layout: 'fullscreen' },
}

export default meta

type Story = StoryObj<typeof TeamGallery>

export const Default: Story = {
  args: {
    label: nosotrosContent.team.title,
    people: nosotrosContent.team.people.slice(0, 3),
  },
}

/** One person without a doctoral or engineering title, as the source cards have. */
export const PlainName: Story = {
  args: {
    label: nosotrosContent.team.title,
    people: nosotrosContent.team.people.filter((person) => person.name === 'Jelmuth Rojas'),
  },
}

export const Empty: Story = {
  args: { label: 'El equipo', people: [] },
}
