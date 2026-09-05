import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { SearchBar, type SearchBarProps } from './SearchBar'
import { CustomSubmitLabel, Default } from './SearchBar.stories'

const defaultArgs = Default.args as SearchBarProps
const customSubmitArgs = CustomSubmitLabel.args as SearchBarProps

describe('SearchBar', () => {
  test('shows the query it was given, under the label it was given', () => {
    render(<SearchBar {...defaultArgs} query="ROSAC" />)

    expect(screen.getByRole('searchbox', { name: defaultArgs.label })).toHaveValue('ROSAC')
  })

  test('reports each keystroke through onQueryChange', async () => {
    const user = userEvent.setup()
    const onQueryChange = vi.fn()
    render(<SearchBar {...defaultArgs} onQueryChange={onQueryChange} />)

    await user.type(screen.getByRole('searchbox', { name: defaultArgs.label }), 'sol')

    expect(onQueryChange).toHaveBeenCalledTimes(3)
    expect(onQueryChange).toHaveBeenLastCalledWith('l')
  })

  test('defaults the submit button label to "Buscar"', () => {
    render(<SearchBar {...defaultArgs} />)

    expect(screen.getByRole('button', { name: 'Buscar' })).toBeInTheDocument()
  })

  test('lets a caller override the submit button label', () => {
    render(<SearchBar {...customSubmitArgs} />)

    expect(screen.getByRole('button', { name: 'Filtrar' })).toBeInTheDocument()
  })

  test('calls onSubmit and prevents navigation when submitted', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<SearchBar {...defaultArgs} onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    // jsdom would report the form navigating if preventDefault() were missing.
    expect(screen.getByRole('search')).toBeInTheDocument()
  })
})
