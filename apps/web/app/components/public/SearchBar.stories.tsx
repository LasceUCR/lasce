import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'

import { SearchBar } from './SearchBar'

const meta: Meta<typeof SearchBar> = {
  component: SearchBar,
  parameters: {
    layout: 'padded',
  },
}

export default meta

type Story = StoryObj<typeof SearchBar>

export const Default: Story = {
  args: {
    query: '',
    label: 'Buscar publicaciones',
    placeholder: 'Buscar por título, autor o palabra clave...',
    onQueryChange: () => {},
  },
}

export const WithQuery: Story = {
  args: {
    ...Default.args,
    query: 'ROSAC',
  },
}

export const CustomSubmitLabel: Story = {
  args: {
    query: '',
    label: 'Buscar noticias y recursos',
    placeholder: 'Buscar por título o palabra clave...',
    submitLabel: 'Filtrar',
    onQueryChange: () => {},
  },
}

export const Interactive: Story = {
  render: function InteractiveSearchBar() {
    const [query, setQuery] = useState('')

    return (
      <SearchBar
        label="Buscar publicaciones"
        onQueryChange={setQuery}
        placeholder="Buscar por título, autor o palabra clave..."
        query={query}
      />
    )
  },
}
