import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { NavGroup } from './NavGroup'

const meta: Meta<typeof NavGroup> = {
  component: NavGroup,
  parameters: { layout: 'centered' },
  // The header's nav row gives the disclosure its height and the panel its anchor.
  decorators: [
    (Story) => (
      <nav aria-label="Navegación principal" className="desktop-nav">
        <Story />
      </nav>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof NavGroup>

const items = [
  { label: 'Publicaciones', href: '/publicaciones' },
  { label: 'Herramientas científicas', href: '/herramientas-cientificas' },
  { label: 'Galería', href: '/galeria' },
]

export const Closed: Story = {
  args: { label: 'Recursos', items, pathname: '/' },
}

export const Open: Story = {
  args: { ...Closed.args, defaultOpen: true },
}

export const WithActiveItem: Story = {
  args: { ...Closed.args, pathname: '/galeria', defaultOpen: true },
}
