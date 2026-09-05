import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'

import { PublicationsExplorer, type PublicationsExplorerProps } from './PublicationsExplorer'
import { Default, Empty } from './PublicationsExplorer.stories'

const defaultArgs = Default.args as PublicationsExplorerProps
const emptyArgs = Empty.args as PublicationsExplorerProps

describe('PublicationsExplorer', () => {
  test('renders one card per publication it is given', () => {
    render(<PublicationsExplorer {...defaultArgs} />)

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(
      defaultArgs.publications.length,
    )
  })

  test('narrows the list to publications matching the search query', async () => {
    const user = userEvent.setup()
    render(<PublicationsExplorer {...defaultArgs} />)

    await user.type(screen.getByRole('searchbox', { name: 'Buscar publicaciones' }), 'ROSAC')

    expect(
      screen.getByRole('heading', {
        name: 'Radiotelescopio del Observatorio de Santa Cruz (ROSAC)',
      }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1)
  })

  test('matches by author as well as by title', async () => {
    const user = userEvent.setup()
    render(<PublicationsExplorer {...defaultArgs} />)

    await user.type(screen.getByRole('searchbox', { name: 'Buscar publicaciones' }), 'LASCE')

    expect(
      screen.getByRole('heading', {
        name: 'Radiotelescopio del Observatorio de Santa Cruz (ROSAC)',
      }),
    ).toBeInTheDocument()
  })

  test('shows an empty state when nothing matches, without losing the heading', () => {
    render(<PublicationsExplorer {...emptyArgs} />)

    expect(screen.getByRole('heading', { name: 'Publicaciones recientes' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('No se encontraron publicaciones')
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
  })
})
