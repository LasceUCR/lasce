import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { PublicationsExplorer, type PublicationsExplorerProps } from './PublicationsExplorer'
import { Default, Empty } from './PublicationsExplorer.stories'

const defaultArgs = Default.args as PublicationsExplorerProps
const emptyArgs = Empty.args as PublicationsExplorerProps

const navigation = vi.hoisted(() => ({ refresh: vi.fn(), editMode: false }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: navigation.refresh,
  }),
}))

vi.mock('@/app/components/public/cms/EditModeProvider', () => ({
  useEditMode: () => ({
    editMode: navigation.editMode,
  }),
}))

const filterPublications: PublicationsExplorerProps['publications'] = [
  {
    slug: 'lasce-1',
    title: 'LASCE Solar Research',
    authors: ['Investigador LASCE'],
    venue: 'Solar Physics',
    year: '2025',
    date: new Date('2025-01-01'),
    abstract: 'Research about solar activity.',
    href: 'https://example.com/lasce',
    researchGroup: 'LASCE',
  },
  {
    slug: 'rosac-1',
    title: 'Radiotelescopio del Observatorio de Santa Cruz (ROSAC)',
    authors: ['Investigador ROSAC'],
    date: new Date('2024-01-01'),
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
        slug: 'lasce-1',
        title: 'LASCE Solar Research',
        authors: ['Investigador LASCE'],
        venue: 'Solar Physics',
        year: '2025',
        date: new Date('2025-01-01'),
        abstract: 'Research about solar activity.',
        href: 'https://example.com/lasce',
        researchGroup: 'LASCE',
      },
      {
        slug: 'rosac-1',
        title: 'Radiotelescopio del Observatorio de Santa Cruz (ROSAC)',
        authors: ['Investigador ROSAC'],
        date: new Date('2024-01-01'),
        venue: 'Radio Science',
        year: '2024',
        abstract: 'Research using ROSAC observations.',
        href: 'https://example.com/rosac',
        researchGroup: 'ROSAC',
      },
    ]

    render(<PublicationsExplorer publications={publications} />)

    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar publicaciones' }),
      'Investigador LASCE',
    )

    expect(screen.getByRole('heading', { name: 'LASCE Solar Research' })).toBeInTheDocument()

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

    const kpi = screen.getByLabelText('Cantidad de publicaciones')

    expect(kpi).toHaveTextContent('2')
    expect(kpi).toHaveTextContent('publicaciones en total')
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

const VERSION = '2026-09-01T10:00:00.000Z'

const bilingual: PublicationsExplorerProps['publications'][number] = {
  slug: '0b6f2a52-3f4c-4a43-9a52-8f7d2b1e9c10',
  title: 'Actividad solar',
  authors: ['Ana Mora'],
  venue: 'Solar Physics',
  year: '2025',
  date: new Date('2025-03-04'),
  abstract: 'Resumen en español.',
  href: 'https://example.com/solar',
  DOI: '10.1234/solar',
  researchGroup: 'LASCE',
  contentLocale: 'es',
  editing: {
    content: {
      es: { title: 'Actividad solar', abstract: 'Resumen en español.' },
      en: { title: 'Solar activity', abstract: 'Abstract in English.' },
    },
    isLegacy: false,
    version: VERSION,
  },
}

const legacy: PublicationsExplorerProps['publications'][number] = {
  slug: '5a1d6f0e-2c47-4f7b-8d3e-0c9b1a2e4f60',
  title: 'Non-thermal electrons',
  authors: ['Luis Vargas'],
  venue: 'Astronomy & Astrophysics',
  year: '2024',
  date: new Date('2024-07-30'),
  abstract: 'Base abstract.',
  DOI: '',
  researchGroup: 'LASCE',
  contentLocale: null,
  editing: {
    content: { es: { title: 'Non-thermal electrons', abstract: 'Base abstract.' }, en: null },
    isLegacy: true,
    version: VERSION,
  },
}

type User = ReturnType<typeof userEvent.setup>

const fetchMock = vi.fn()

function respond(status: number, body: unknown = {}) {
  fetchMock.mockResolvedValue(
    new Response(status === 204 ? null : JSON.stringify(body), { status }),
  )
}

function requestBody(call = 0) {
  const [, init] = fetchMock.mock.calls[call] ?? []
  return JSON.parse((init as RequestInit).body as string)
}

function renderEditor(publications = [bilingual, legacy]) {
  navigation.editMode = true
  vi.stubGlobal('fetch', fetchMock)
  render(<PublicationsExplorer canCreate canDelete canEdit publications={publications} />)
  return userEvent.setup()
}

function labelled(label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return screen.getByRole('textbox', { name: new RegExp(`^${escaped}`) })
}

async function confirmAndSave(user: User, title = 'Guardar cambios') {
  await user.click(screen.getByRole('button', { name: 'Confirmar' }))
  const dialog = screen.getByRole('dialog', { name: title })
  await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))
}

afterEach(() => {
  navigation.editMode = false
  fetchMock.mockReset()
  navigation.refresh.mockReset()
  vi.unstubAllGlobals()
})

describe('PublicationsExplorer: content language', () => {
  test('marks each card with the language of its text', () => {
    render(<PublicationsExplorer publications={[bilingual, legacy]} />)

    expect(screen.getByRole('heading', { name: 'Actividad solar' })).toHaveAttribute('lang', 'es')
    expect(screen.getByRole('heading', { name: 'Non-thermal electrons' })).toHaveAttribute(
      'lang',
      '',
    )
  })

  test('tells visitors nothing about missing translations', () => {
    render(<PublicationsExplorer publications={[legacy]} />)

    expect(screen.queryByText(/Sin versión en inglés/)).not.toBeInTheDocument()
  })

  test('tells editors which publication has no English version', () => {
    renderEditor()

    expect(screen.getAllByText(/Sin versión en inglés/)).toHaveLength(1)
  })
})

describe('PublicationsExplorer: saving', () => {
  test('creates a publication in both languages', async () => {
    const user = renderEditor()
    respond(201, { publication: bilingual })

    await user.click(screen.getByRole('button', { name: 'Añadir' }))
    const dialog = screen.getByRole('dialog', { name: 'Añadir' })
    await user.type(within(dialog).getByRole('textbox', { name: /^Título \(Español\)/ }), 'Nuevo')
    await user.type(
      within(dialog).getByRole('textbox', { name: /^Resumen \(Español\)/ }),
      'Resumen',
    )
    await user.click(within(dialog).getByRole('tab', { name: /^English/ }))
    await user.type(within(dialog).getByRole('textbox', { name: /^Título \(English\)/ }), 'New')
    await user.type(
      within(dialog).getByRole('textbox', { name: /^Resumen \(English\)/ }),
      'Abstract',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Añadir autor' }))
    const authorDialog = screen.getByRole('dialog', { name: 'Añadir autor' })
    await user.type(within(authorDialog).getByRole('textbox', { name: 'Nombre del autor' }), 'Ana')
    await user.click(within(authorDialog).getByRole('button', { name: 'Añadir' }))
    await user.type(within(dialog).getByRole('textbox', { name: /^Revista/ }), 'Solar Physics')
    await confirmAndSave(user, 'Agregar publicación')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/publicaciones',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(requestBody()).toMatchObject({
      content: {
        es: { title: 'Nuevo', abstract: 'Resumen' },
        en: { title: 'New', abstract: 'Abstract' },
      },
      authors: ['Ana'],
      venue: 'Solar Physics',
      href: null,
      DOI: null,
      researchGroup: 'LASCE',
    })
    expect(navigation.refresh).toHaveBeenCalled()
  })

  test('sends only the changed shared field, with the version, for a legacy record', async () => {
    const user = renderEditor()
    respond(200, { publication: legacy })

    await user.click(screen.getByRole('button', { name: 'Editar Non-thermal electrons' }))
    await user.type(labelled('DOI'), '10.5555/fixed')
    await confirmAndSave(user)

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/publicaciones/${legacy.slug}`,
      expect.objectContaining({ method: 'PATCH' }),
    )
    expect(requestBody()).toEqual({ version: VERSION, DOI: '10.5555/fixed' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('sends both languages and the explicit confirmation for a content edit', async () => {
    const user = renderEditor()
    respond(200, { publication: bilingual })

    await user.click(screen.getByRole('button', { name: 'Editar Actividad solar' }))
    await user.clear(labelled('Título (Español)'))
    await user.type(labelled('Título (Español)'), 'Actividad solar reciente')
    await user.click(screen.getByRole('tab', { name: /^English/ }))
    await user.click(
      screen.getByRole('switch', { name: 'El título en inglés sigue siendo correcto' }),
    )
    await confirmAndSave(user)

    expect(requestBody()).toEqual({
      version: VERSION,
      content: {
        es: { title: 'Actividad solar reciente', abstract: 'Resumen en español.' },
        en: { title: 'Solar activity', abstract: 'Abstract in English.' },
      },
      confirmedUnchanged: [{ locale: 'en', field: 'title' }],
    })
  })

  test('sends a shared-field edit of a bilingual record without its text', async () => {
    const user = renderEditor()
    respond(200, { publication: bilingual })

    await user.click(screen.getByRole('button', { name: 'Editar Actividad solar' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Grupo' }), 'ROSAC')
    await user.clear(labelled('Enlace externo'))
    await confirmAndSave(user)

    expect(requestBody()).toEqual({ version: VERSION, href: null, researchGroup: 'ROSAC' })
  })

  test('sends one request even if save is confirmed twice while it is in flight', async () => {
    const user = renderEditor()
    let finish: (response: Response) => void = () => {}
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => (finish = resolve)))

    await user.click(screen.getByRole('button', { name: 'Editar Actividad solar' }))
    await user.clear(labelled('Revista/Publicación'))
    await user.type(labelled('Revista/Publicación'), 'Nature')
    await confirmAndSave(user)
    await confirmAndSave(user)

    expect(fetchMock).toHaveBeenCalledTimes(1)

    finish(new Response(JSON.stringify({ publication: bilingual }), { status: 200 }))
    await vi.waitFor(() => expect(navigation.refresh).toHaveBeenCalled())
  })

  test('closes without a request when nothing changed', async () => {
    const user = renderEditor()

    await user.click(screen.getByRole('button', { name: 'Editar Actividad solar' }))
    await confirmAndSave(user)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('explains a concurrent change, keeps what was typed and offers to reload', async () => {
    const user = renderEditor()
    respond(409, { code: 'conflict', error: 'La publicación cambió.' })

    await user.click(screen.getByRole('button', { name: 'Editar Actividad solar' }))
    await user.clear(labelled('Revista/Publicación'))
    await user.type(labelled('Revista/Publicación'), 'Nature')
    await confirmAndSave(user)

    expect(screen.getByText(/Otra persona guardó cambios en esta publicación/)).toBeInTheDocument()
    expect(labelled('Revista/Publicación')).toHaveValue('Nature')
    expect(navigation.refresh).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Cerrar y cargar la versión actual' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(navigation.refresh).toHaveBeenCalled()
  })

  test('shows the server validation errors under their field and language', async () => {
    const user = renderEditor()
    respond(400, {
      code: 'invalid-body',
      error: 'Faltan campos obligatorios o no son válidos.',
      issues: [{ path: 'content.en.abstract', message: 'El resumen en inglés es obligatorio.' }],
    })

    await user.click(screen.getByRole('button', { name: 'Editar Actividad solar' }))
    await user.clear(labelled('Revista/Publicación'))
    await user.type(labelled('Revista/Publicación'), 'Nature')
    await confirmAndSave(user)

    expect(screen.getByRole('tab', { name: /^English/ })).toHaveAttribute('aria-selected', 'true')
    expect(labelled('Resumen (English)')).toHaveAccessibleDescription(
      'El resumen en inglés es obligatorio.',
    )
  })

  test('shows a duplicate DOI under the DOI field', async () => {
    const user = renderEditor()
    respond(409, { code: 'duplicate-doi', error: 'Ya existe una publicación con este DOI.' })

    await user.click(screen.getByRole('button', { name: 'Editar Actividad solar' }))
    await user.clear(labelled('DOI'))
    await user.type(labelled('DOI'), '10.1234/taken')
    await confirmAndSave(user)

    expect(labelled('DOI')).toHaveAccessibleDescription('Ya existe una publicación con este DOI.')
  })

  test.each([
    [401, { error: 'No ha iniciado sesión.' }, /No ha iniciado sesión\. Inicie sesión de nuevo/],
    [403, { error: 'No tiene permisos para modificar este contenido.' }, /No tiene permisos/],
    [404, { code: 'not-found', error: 'No existe.' }, /Esta publicación ya no existe/],
    [
      500,
      { code: 'internal-error', error: 'No se pudo guardar la publicación.' },
      /No se pudo guardar la publicación\./,
    ],
  ])('explains a %i and keeps the form open with its values', async (status, body, message) => {
    const user = renderEditor()
    respond(status, body)

    await user.click(screen.getByRole('button', { name: 'Editar Actividad solar' }))
    await user.clear(labelled('Revista/Publicación'))
    await user.type(labelled('Revista/Publicación'), 'Nature')
    await confirmAndSave(user)

    expect(screen.getByText(message)).toBeInTheDocument()
    expect(labelled('Revista/Publicación')).toHaveValue('Nature')
  })

  test('keeps the values when the network fails', async () => {
    const user = renderEditor()
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await user.click(screen.getByRole('button', { name: 'Editar Actividad solar' }))
    await user.clear(labelled('Revista/Publicación'))
    await user.type(labelled('Revista/Publicación'), 'Nature')
    await confirmAndSave(user)

    expect(
      screen.getByText('No se pudo guardar el cambio. Inténtelo de nuevo.'),
    ).toBeInTheDocument()
    expect(labelled('Revista/Publicación')).toHaveValue('Nature')
  })

  test('reports a failed delete outside the editor', async () => {
    const user = renderEditor()
    respond(403, { error: 'No tiene permisos para modificar este contenido.' })

    await user.click(screen.getByRole('button', { name: 'Eliminar Actividad solar' }))
    const dialog = screen.getByRole('dialog', { name: 'Eliminar publicacion' })
    await user.click(within(dialog).getByRole('button', { name: /Eliminar|Confirmar/ }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No tiene permisos para modificar este contenido.',
    )
  })
})

describe('PublicationsExplorer: adding with nothing listed', () => {
  test('offers to add a publication when there are none yet', () => {
    renderEditor([])

    expect(screen.getByText('No hay publicaciones disponibles.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Añadir' })).toBeInTheDocument()
  })

  test('offers to add a publication when a filter matches none', async () => {
    const user = renderEditor()

    await user.type(screen.getByRole('searchbox', { name: 'Buscar publicaciones' }), 'zzz')

    expect(screen.getByRole('status')).toHaveTextContent('No se encontraron publicaciones')
    expect(screen.getByRole('button', { name: 'Añadir' })).toBeInTheDocument()
  })

  test('does not offer to add without the create permission', () => {
    navigation.editMode = true
    render(<PublicationsExplorer canEdit publications={[]} />)

    expect(screen.queryByRole('button', { name: 'Añadir' })).not.toBeInTheDocument()
  })

  test('does not offer to add outside edit mode', () => {
    render(<PublicationsExplorer canCreate publications={[]} />)

    expect(screen.queryByRole('button', { name: 'Añadir' })).not.toBeInTheDocument()
  })
})
