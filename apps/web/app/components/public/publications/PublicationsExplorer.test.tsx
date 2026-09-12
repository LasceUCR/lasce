import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'

import { PublicationsExplorer, type PublicationsExplorerProps } from './PublicationsExplorer'
import { Default, Empty } from './PublicationsExplorer.stories'

const defaultArgs = Default.args as PublicationsExplorerProps
const emptyArgs = Empty.args as PublicationsExplorerProps

const filterPublications: PublicationsExplorerProps['publications'] = [
  {
    slug: 'lasce-1',
    title: 'LASCE Solar Research',
    authors: 'Investigador LASCE',
    venue: 'Solar Physics',
    year: '2025',
    abstract: 'Research about solar activity.',
    href: 'https://example.com/lasce',
    researchGroup: 'LASCE',
  },
  {
    slug: 'rosac-1',
    title: 'Radiotelescopio del Observatorio de Santa Cruz (ROSAC)',
    authors: 'Investigador ROSAC',
    venue: 'Radio Science',
    year: '2024',
    abstract: 'Research using ROSAC observations.',
    href: 'https://example.com/rosac',
    researchGroup: 'ROSAC',
  },
]

const lascePublications = filterPublications.filter(
  (publication) => publication.researchGroup === 'LASCE',
)

const rosacPublications = filterPublications.filter(
  (publication) => publication.researchGroup === 'ROSAC',
)

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

  test('shows an empty state when there are no publications', () => {
    render(<PublicationsExplorer {...emptyArgs} />)

    expect(screen.getByRole('heading', { name: 'Publicaciones recientes' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('No hay publicaciones disponibles.')
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
  })

  test('filters publications by LASCE', async () => {
    const user = userEvent.setup()

    render(<PublicationsExplorer publications={filterPublications} />)

    await user.click(screen.getByRole('button', { name: 'LASCE' }))

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(
      lascePublications.length,
    )

    for (const publication of lascePublications) {
      expect(screen.getByRole('heading', { name: publication.title })).toBeInTheDocument()
    }

    for (const publication of rosacPublications) {
      expect(screen.queryByRole('heading', { name: publication.title })).not.toBeInTheDocument()
    }
  })

  test('filters publications by ROSAC', async () => {
    const user = userEvent.setup()

    render(<PublicationsExplorer publications={filterPublications} />)

    await user.click(screen.getByRole('button', { name: 'ROSAC' }))

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(
      rosacPublications.length,
    )

    for (const publication of rosacPublications) {
      expect(screen.getByRole('heading', { name: publication.title })).toBeInTheDocument()
    }

    for (const publication of lascePublications) {
      expect(screen.queryByRole('heading', { name: publication.title })).not.toBeInTheDocument()
    }
  })

  test('returns to all publications when the selected group is clicked again', async () => {
    const user = userEvent.setup()

    render(<PublicationsExplorer publications={filterPublications} />)

    const lasceButton = screen.getByRole('button', { name: 'LASCE' })

    await user.click(lasceButton)

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(
      lascePublications.length,
    )

    await user.click(lasceButton)

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(
      filterPublications.length,
    )
  })

  test('combines the group filter with the search query', async () => {
    const user = userEvent.setup()

    render(<PublicationsExplorer publications={filterPublications} />)

    await user.click(screen.getByRole('button', { name: 'LASCE' }))
    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar publicaciones' }),
      'Solar',
    )

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1)

    expect(
      screen.getByRole('heading', { name: 'LASCE Solar Research' }),
    ).toBeInTheDocument()

    expect(
      screen.queryByRole('heading', {
        name: 'Radiotelescopio del Observatorio de Santa Cruz (ROSAC)',
      }),
    ).not.toBeInTheDocument()
  })

  test('shows a group-specific empty state when the selected group has no publications', async () => {
    const user = userEvent.setup()

    const otherGroupPublications = defaultArgs.publications.filter(
      (publication) => publication.researchGroup === 'ROSAC',
    )

    render(
      <PublicationsExplorer
        publications={otherGroupPublications}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'LASCE' }))

    expect(screen.getByRole('status')).toHaveTextContent('No hay publicaciones de LASCE.')
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
  })

  test('shows a group-specific empty state when the search has no matches', async () => {
    const user = userEvent.setup()
    render(<PublicationsExplorer {...defaultArgs} />)

    await user.click(screen.getByRole('button', { name: 'LASCE' }))
    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar publicaciones' }),
      'texto-que-no-existe',
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      'No se encontraron publicaciones de LASCE para “texto-que-no-existe”.',
    )
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
  })
})
