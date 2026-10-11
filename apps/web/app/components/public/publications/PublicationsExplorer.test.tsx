import { screen, within } from '@testing-library/react'

import { renderWithIntl } from '@/app/lib/i18n/testing'
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
    renderWithIntl(<PublicationsExplorer {...defaultArgs} />)

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(
      defaultArgs.publications.length,
    )
  })

  test('shows the total number of publications in the KPI', () => {
    renderWithIntl(<PublicationsExplorer {...defaultArgs} />)

    const kpi = screen.getByLabelText('Cantidad de publicaciones')

    expect(kpi).toHaveTextContent(`${defaultArgs.publications.length}`)
    expect(kpi).toHaveTextContent('publicaciones')
  })

  test('narrows the list and KPI to publications matching the search query', async () => {
    const user = userEvent.setup()
    renderWithIntl(<PublicationsExplorer {...defaultArgs} />)

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

    renderWithIntl(<PublicationsExplorer publications={publications} />)

    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar publicaciones' }),
      'Investigador LASCE',
    )

    expect(screen.getByRole('heading', { name: 'LASCE Solar Research' })).toBeInTheDocument()

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1)
  })

  test('shows an empty state when there are no publications', () => {
    renderWithIntl(<PublicationsExplorer {...emptyArgs} />)

    expect(screen.getByRole('heading', { name: 'Publicaciones recientes' })).toBeInTheDocument()

    expect(screen.getByRole('status')).toHaveTextContent('No hay publicaciones disponibles.')

    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
  })

  test('filters publications by LASCE', async () => {
    const user = userEvent.setup()

    renderWithIntl(<PublicationsExplorer publications={filterPublications} />)

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
    expect(screen.getByText('publicación (LASCE)')).toBeInTheDocument()
  })

  test('filters publications by ROSAC', async () => {
    const user = userEvent.setup()

    renderWithIntl(<PublicationsExplorer publications={filterPublications} />)

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
    expect(screen.getByText('publicación (ROSAC)')).toBeInTheDocument()
  })

  test('returns to all publications when the group filter is reset', async () => {
    const user = userEvent.setup()

    renderWithIntl(<PublicationsExplorer publications={filterPublications} />)

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

    renderWithIntl(<PublicationsExplorer publications={filterPublications} />)

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
    expect(screen.getByText('publicación (LASCE)')).toBeInTheDocument()
  })

  test('shows a group-specific empty state when the selected group has no publications', async () => {
    const user = userEvent.setup()

    const otherGroupPublications = defaultArgs.publications.filter(
      (publication) => publication.researchGroup === 'ROSAC',
    )

    renderWithIntl(<PublicationsExplorer publications={otherGroupPublications} />)

    await selectResearchGroup(user, 'LASCE')

    expect(screen.getByRole('status')).toHaveTextContent('No hay publicaciones de LASCE.')

    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  test('shows a group-specific empty state when the search has no matches', async () => {
    const user = userEvent.setup()

    renderWithIntl(<PublicationsExplorer {...defaultArgs} />)

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

function renderEditor(publications = [bilingual, legacy], locale: 'es' | 'en' = 'es') {
  navigation.editMode = true
  vi.stubGlobal('fetch', fetchMock)
  renderWithIntl(<PublicationsExplorer canCreate canDelete canEdit publications={publications} />, {
    locale,
  })
  return userEvent.setup()
}

function labelled(label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return screen.getByRole('textbox', { name: new RegExp(`^${escaped}`) })
}

/** Saving asks for no confirmation: "Confirmar" saves straight away once the form is valid. */
async function save(user: User) {
  await user.click(screen.getByRole('button', { name: 'Confirmar' }))
}

afterEach(() => {
  navigation.editMode = false
  fetchMock.mockReset()
  navigation.refresh.mockReset()
  vi.unstubAllGlobals()
})

describe('PublicationsExplorer: content language', () => {
  test('marks each card with the language of its text', () => {
    renderWithIntl(<PublicationsExplorer publications={[bilingual, legacy]} />)

    expect(screen.getByRole('heading', { name: 'Actividad solar' })).toHaveAttribute('lang', 'es')
    expect(screen.getByRole('heading', { name: 'Non-thermal electrons' })).toHaveAttribute(
      'lang',
      '',
    )
  })

  test('tells visitors nothing about missing translations', () => {
    renderWithIntl(<PublicationsExplorer publications={[legacy]} />)

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

    await user.click(screen.getByRole('button', { name: 'Agregar publicación' }))
    const dialog = screen.getByRole('dialog', { name: 'Agregar publicación' })
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
    await user.type(within(dialog).getByRole('textbox', { name: 'Nombre del autor' }), 'Ana')
    await user.click(within(dialog).getByRole('button', { name: 'Agregar' }))
    await user.type(within(dialog).getByRole('textbox', { name: /^Revista/ }), 'Solar Physics')
    await save(user)

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
    await save(user)

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
    await save(user)

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
    await save(user)

    expect(requestBody()).toEqual({ version: VERSION, href: null, researchGroup: 'ROSAC' })
  })

  test('sends one request even if save is clicked twice while it is in flight', async () => {
    const user = renderEditor()
    let finish: (response: Response) => void = () => {}
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => (finish = resolve)))

    await user.click(screen.getByRole('button', { name: 'Editar Actividad solar' }))
    await user.clear(labelled('Revista/Publicación'))
    await user.type(labelled('Revista/Publicación'), 'Nature')
    await save(user)
    await save(user)

    expect(fetchMock).toHaveBeenCalledTimes(1)

    finish(new Response(JSON.stringify({ publication: bilingual }), { status: 200 }))
    await vi.waitFor(() => expect(navigation.refresh).toHaveBeenCalled())
  })

  test('closes without a request when nothing changed', async () => {
    const user = renderEditor()

    await user.click(screen.getByRole('button', { name: 'Editar Actividad solar' }))
    await save(user)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('explains a concurrent change, keeps what was typed and offers to reload', async () => {
    const user = renderEditor()
    respond(409, { code: 'conflict', error: 'La publicación cambió.' })

    await user.click(screen.getByRole('button', { name: 'Editar Actividad solar' }))
    await user.clear(labelled('Revista/Publicación'))
    await user.type(labelled('Revista/Publicación'), 'Nature')
    await save(user)

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
    await save(user)

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
    await save(user)

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
    await save(user)

    expect(screen.getByText(message)).toBeInTheDocument()
    expect(labelled('Revista/Publicación')).toHaveValue('Nature')
  })

  test('keeps the values when the network fails', async () => {
    const user = renderEditor()
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await user.click(screen.getByRole('button', { name: 'Editar Actividad solar' }))
    await user.clear(labelled('Revista/Publicación'))
    await user.type(labelled('Revista/Publicación'), 'Nature')
    await save(user)

    expect(
      screen.getByText('No se pudo guardar el cambio. Inténtelo de nuevo.'),
    ).toBeInTheDocument()
    expect(labelled('Revista/Publicación')).toHaveValue('Nature')
  })

  test('reports a failed delete outside the editor', async () => {
    const user = renderEditor()
    respond(403, { error: 'No tiene permisos para modificar este contenido.' })

    await user.click(screen.getByRole('button', { name: 'Eliminar Actividad solar' }))
    const dialog = screen.getByRole('dialog', { name: 'Eliminar publicación' })
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No tiene permisos para modificar este contenido.',
    )
  })
})

describe('PublicationsExplorer: closing and deleting', () => {
  test('opens the editor under the standard title', async () => {
    const user = renderEditor()

    await user.click(screen.getByRole('button', { name: 'Editar Actividad solar' }))

    expect(screen.getByRole('dialog', { name: 'Editar publicación' })).toBeInTheDocument()
  })

  test('asks before Escape discards an edit, and keeps the editor open to continue', async () => {
    const user = renderEditor()

    await user.click(screen.getByRole('button', { name: 'Editar Actividad solar' }))
    await user.clear(labelled('Revista/Publicación'))
    await user.type(labelled('Revista/Publicación'), 'Nature')
    await user.keyboard('{Escape}')

    const discard = screen.getByRole('dialog', { name: 'Descartar cambios no guardados' })
    await user.click(within(discard).getByRole('button', { name: 'Seguir editando' }))

    expect(labelled('Revista/Publicación')).toHaveValue('Nature')

    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Descartar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('closes an untouched editor with Escape without asking', async () => {
    const user = renderEditor()

    await user.click(screen.getByRole('button', { name: 'Agregar publicación' }))
    // A browser moves focus into the dialog it opens; jsdom does not.
    await user.click(labelled('Título (Español)'))
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('asks before Escape discards a new publication', async () => {
    const user = renderEditor()

    await user.click(screen.getByRole('button', { name: 'Agregar publicación' }))
    await user.type(labelled('Título (Español)'), 'Borrador')
    await user.keyboard('{Escape}')

    expect(
      screen.getByRole('dialog', { name: 'Descartar cambios no guardados' }),
    ).toBeInTheDocument()
  })

  test('names the publication in the delete confirmation and deletes it', async () => {
    const user = renderEditor()
    respond(200, {})

    await user.click(screen.getByRole('button', { name: 'Eliminar Actividad solar' }))
    const dialog = screen.getByRole('dialog', { name: 'Eliminar publicación' })

    expect(dialog).toHaveTextContent(
      'Esta acción no se puede deshacer y borrará la publicación del catálogo público.',
    )
    expect(dialog).toHaveTextContent('Elemento: Actividad solar')

    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/publicaciones/${bilingual.slug}`,
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})

describe('PublicationsExplorer: in English, the language the site is shown in', () => {
  test('names the editing controls and the editor in English', async () => {
    const user = renderEditor([bilingual, legacy], 'en')

    expect(screen.getByRole('button', { name: 'Add publication' })).toBeInTheDocument()
    expect(screen.getByText(/^No English version\./)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Edit Actividad solar' }))

    expect(screen.getByRole('dialog', { name: 'Edit publication' })).toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: 'Content language' })).toBeInTheDocument()
  })

  test('confirms a deletion in English, naming the publication', async () => {
    const user = renderEditor([bilingual, legacy], 'en')
    respond(403, { error: 'No tiene permisos para modificar este contenido.' })

    await user.click(screen.getByRole('button', { name: 'Delete Actividad solar' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete publication' })
    expect(dialog).toHaveTextContent(
      'This action cannot be undone and will remove the publication from the public catalog.',
    )
    expect(dialog).toHaveTextContent('Item: Actividad solar')
    await user.click(within(dialog).getByRole('button', { name: 'Confirm' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'You do not have permission to modify this content.',
    )
  })

  test('explains a concurrent change in English and offers to reload', async () => {
    const user = renderEditor([bilingual, legacy], 'en')
    respond(409, { code: 'conflict', error: 'La publicación cambió.' })

    await user.click(screen.getByRole('button', { name: 'Edit Actividad solar' }))
    await user.clear(labelled('Journal/Publication'))
    await user.type(labelled('Journal/Publication'), 'Nature')
    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(screen.getByText(/^Someone else saved changes to this publication/)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Close and load the current version' }),
    ).toBeInTheDocument()
  })

  test('says in English that the network failed', async () => {
    const user = renderEditor([bilingual, legacy], 'en')
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await user.click(screen.getByRole('button', { name: 'Edit Actividad solar' }))
    await user.clear(labelled('Journal/Publication'))
    await user.type(labelled('Journal/Publication'), 'Nature')
    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(screen.getByText('The change could not be saved. Please try again.')).toBeInTheDocument()
  })
})

describe('PublicationsExplorer: the page in English', () => {
  test('shows the search, the filter, the count and the heading in English', () => {
    renderWithIntl(<PublicationsExplorer publications={[bilingual, legacy]} />, { locale: 'en' })

    expect(screen.getByRole('searchbox', { name: 'Search publications' })).toHaveAttribute(
      'placeholder',
      'Search by title, author or keyword...',
    )
    expect(screen.getByRole('combobox', { name: 'Research group' })).toHaveTextContent(
      'All publications',
    )
    expect(screen.getByLabelText('Number of publications')).toHaveTextContent(
      '2publications in total',
    )
    expect(screen.getByRole('heading', { name: 'Recent publications' })).toBeInTheDocument()
  })

  test('counts one publication in the singular, in both languages', () => {
    const { unmount } = renderWithIntl(<PublicationsExplorer publications={[bilingual]} />)
    expect(screen.getByLabelText('Cantidad de publicaciones')).toHaveTextContent(
      '1publicación en total',
    )
    unmount()

    renderWithIntl(<PublicationsExplorer publications={[bilingual]} />, { locale: 'en' })
    expect(screen.getByLabelText('Number of publications')).toHaveTextContent(
      '1publication in total',
    )
  })

  test('explains an empty search in English', async () => {
    const user = userEvent.setup()
    renderWithIntl(<PublicationsExplorer publications={[bilingual, legacy]} />, { locale: 'en' })

    await user.type(screen.getByRole('searchbox', { name: 'Search publications' }), 'zzz')

    expect(screen.getByRole('status')).toHaveTextContent('No publications were found for “zzz”.')
  })
})

describe('PublicationsExplorer: adding with nothing listed', () => {
  test('offers to add a publication when there are none yet', () => {
    renderEditor([])

    expect(screen.getByText('No hay publicaciones disponibles.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Agregar publicación' })).toBeInTheDocument()
  })

  test('offers to add a publication when a filter matches none', async () => {
    const user = renderEditor()

    await user.type(screen.getByRole('searchbox', { name: 'Buscar publicaciones' }), 'zzz')

    expect(screen.getByRole('status')).toHaveTextContent('No se encontraron publicaciones')
    expect(screen.getByRole('button', { name: 'Agregar publicación' })).toBeInTheDocument()
  })

  test('does not offer to add without the create permission', () => {
    navigation.editMode = true
    renderWithIntl(<PublicationsExplorer canEdit publications={[]} />)

    expect(screen.queryByRole('button', { name: 'Agregar publicación' })).not.toBeInTheDocument()
  })

  test('does not offer to add outside edit mode', () => {
    renderWithIntl(<PublicationsExplorer canCreate publications={[]} />)

    expect(screen.queryByRole('button', { name: 'Agregar publicación' })).not.toBeInTheDocument()
  })
})
