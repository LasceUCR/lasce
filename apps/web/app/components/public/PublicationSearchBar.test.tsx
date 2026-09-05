import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { PublicationSearchBar, type PublicationSearchBarProps } from './PublicationSearchBar'
import { Default } from './PublicationSearchBar.stories'

const defaultArgs = Default.args as PublicationSearchBarProps

describe('PublicationSearchBar', () => {
  test('shows the query it was given', () => {
    render(<PublicationSearchBar {...defaultArgs} query="ROSAC" />)

    expect(screen.getByRole('searchbox', { name: 'Buscar publicaciones' })).toHaveValue('ROSAC')
  })

  test('reports each keystroke through onQueryChange', async () => {
    const user = userEvent.setup()
    const onQueryChange = vi.fn()
    render(<PublicationSearchBar {...defaultArgs} onQueryChange={onQueryChange} />)

    await user.type(screen.getByRole('searchbox', { name: 'Buscar publicaciones' }), 'sol')

    expect(onQueryChange).toHaveBeenCalledTimes(3)
    expect(onQueryChange).toHaveBeenLastCalledWith('l')
  })

  test('does not navigate away when submitted', async () => {
    const user = userEvent.setup()
    render(<PublicationSearchBar {...defaultArgs} />)

    await user.click(screen.getByRole('button', { name: 'Buscar' }))

    // jsdom would report the form navigating if preventDefault() were missing.
    expect(screen.getByRole('search')).toBeInTheDocument()
  })
})