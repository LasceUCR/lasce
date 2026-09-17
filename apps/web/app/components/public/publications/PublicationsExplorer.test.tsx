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

async function selectResearchGroup(
  user: ReturnType<typeof userEvent.setup>,
  group: 'LASCE' | 'ROSAC' | '',
) {
  await user.click(screen.getByRole('combobox', { name: 'Grupo de investigación' }))
  await user.click(
    screen.getByRole('option', {
      name: group === '' ? 'Todas las publicaciones' : group,
    }),
  )
}

describe('PublicationsExplorer', () => {
  test('renders one card per publication it is given', () => {
    render(<PublicationsExplorer {...defaultArgs} />)

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(
      defaultArgs.publications.length,
    )
  })

  test('shows the total number of publications in the KPI', () => {
    render(<PublicationsExplorer {...defaultArgs} />)

    const kpi = screen.getByLabelText('Cantidad de publicaciones')

    expect(kpi).toHaveTextContent(`${defaultArgs.publications.length}`)
    expect(kpi).toHaveTextContent('publicaciones')
  })

  test('narrows the list and KPI to publications matching the search query', async () => {
    const user = userEvent.setup()
    render(<PublicationsExplorer {...defaultArgs} />)

    await user.type(screen.getByRole('searchbox', { name: 'Buscar publicaciones' }), 'ROSAC')

    expect(
      screen.getByRole('heading', {
        name: 'Radiotelescopio del Observatorio de Santa Cruz (ROSAC)',
      }),
    ).toBeInTheDocument()

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1)

    const kpi = screen.getByLabelText('Cantidad de publicaciones')
    expect(kpi).toHaveTextContent('1')
  })

  test('matches by author as well as by title', async () => {
    const user = userEvent.setup()

    const publications: PublicationsExplorerProps['publications'] = [
      {
        slug: 'author-match',
        title: 'Publicación de prueba',
        authors: 'Investigador LASCE',
        venue: 'Solar Physics',
        year: '2025',
        abstract: 'Research about solar activity.',
        href: 'https://example.com/publication',
        researchGroup: 'LASCE',
      },
    ]

    render(<PublicationsExplorer publications={publications} />)

    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar publicaciones' }),
      'Investigador LASCE',
    )

    expect(screen.getByRole('heading', { name: 'Publicación de prueba' })).toBeInTheDocument()

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1)
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

    await selectResearchGroup(user, 'LASCE')

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(lascePublications.length)

    expect(screen.getByRole('heading', { name: 'LASCE Solar Research' })).toBeInTheDocument()

    expect(
      screen.queryByRole('heading', {
        name: 'Radiotelescopio del Observatorio de Santa Cruz (ROSAC)',
      }),
    ).not.toBeInTheDocument()

    const kpi = screen.getByLabelText('Cantidad de publicaciones')
    expect(kpi).toHaveTextContent('1')
    expect(screen.getByText('publicaciones (LASCE)')).toBeInTheDocument()
  })

  test('filters publications by ROSAC', async () => {
    const user = userEvent.setup()

    render(<PublicationsExplorer publications={filterPublications} />)

    await selectResearchGroup(user, 'ROSAC')

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(rosacPublications.length)

    expect(
      screen.getByRole('heading', {
        name: 'Radiotelescopio del Observatorio de Santa Cruz (ROSAC)',
      }),
    ).toBeInTheDocument()

    expect(screen.queryByRole('heading', { name: 'LASCE Solar Research' })).not.toBeInTheDocument()

    const kpi = screen.getByLabelText('Cantidad de publicaciones')
    expect(kpi).toHaveTextContent('1')
    expect(screen.getByText('publicaciones (ROSAC)')).toBeInTheDocument()
  })

  test('returns to all publications when the group filter is reset', async () => {
    const user = userEvent.setup()

    render(<PublicationsExplorer publications={filterPublications} />)

    await selectResearchGroup(user, 'LASCE')

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(lascePublications.length)

    await selectResearchGroup(user, '')

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(filterPublications.length)

    expect(screen.getByLabelText('Cantidad de publicaciones')).toHaveTextContent('2 publicaciones en total')
  })

  test('combines the group filter with the search query', async () => {
    const user = userEvent.setup()

    render(<PublicationsExplorer publications={filterPublications} />)

    await selectResearchGroup(user, 'LASCE')

    await user.type(screen.getByRole('searchbox', { name: 'Buscar publicaciones' }), 'Solar')

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1)

    expect(screen.getByRole('heading', { name: 'LASCE Solar Research' })).toBeInTheDocument()

    expect(
      screen.queryByRole('heading', {
        name: 'Radiotelescopio del Observatorio de Santa Cruz (ROSAC)',
      }),
    ).not.toBeInTheDocument()

    const kpi = screen.getByLabelText('Cantidad de publicaciones')
    expect(kpi).toHaveTextContent('1')
    expect(screen.getByText('publicaciones (LASCE)')).toBeInTheDocument()
  })

  test('shows a group-specific empty state when the selected group has no publications', async () => {
    const user = userEvent.setup()

    const otherGroupPublications = defaultArgs.publications.filter(
      (publication) => publication.researchGroup === 'ROSAC',
    )

    render(<PublicationsExplorer publications={otherGroupPublications} />)

    await selectResearchGroup(user, 'LASCE')

    expect(screen.getByRole('status')).toHaveTextContent('No hay publicaciones de LASCE.')

    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  test('shows a group-specific empty state when the search has no matches', async () => {
    const user = userEvent.setup()

    render(<PublicationsExplorer {...defaultArgs} />)

    await selectResearchGroup(user, 'LASCE')

    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar publicaciones' }),
      'texto-que-no-existe',
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      'No se encontraron publicaciones de LASCE para “texto-que-no-existe”.',
    )

    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})
