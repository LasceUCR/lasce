import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'

import { PublicationSearchBar } from './PublicationSearchBar'

const meta: Meta<typeof PublicationSearchBar> = {
  component: PublicationSearchBar,
  parameters: {
    layout: 'padded',
  },
}

export default meta

type Story = StoryObj<typeof PublicationSearchBar>

export const Default: Story = {
  args: {
    query: '',
    onQueryChange: () => {},
  },
}

export const WithQuery: Story = {
  args: {
    query: 'ROSAC',
    onQueryChange: () => {},
  },
}

export const Interactive: Story = {
  render: function InteractiveSearchBar() {
    const [query, setQuery] = useState('')

    return <PublicationSearchBar onQueryChange={setQuery} query={query} />
  },
}
