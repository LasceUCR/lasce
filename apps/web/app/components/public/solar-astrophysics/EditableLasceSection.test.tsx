import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import { renderWithIntl } from '@/app/lib/i18n/testing'

import { EditableLasceSection, type EditableLasceSectionProps } from './EditableLasceSection'
import { Editor } from './EditableLasceSection.stories'

const editorArgs = Editor.args as EditableLasceSectionProps

const navigation = vi.hoisted(() => ({ refresh: vi.fn(), editMode: false }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: navigation.refresh }),
}))

vi.mock('@/app/components/public/cms/EditModeProvider', () => ({
  useEditMode: () => ({ editMode: navigation.editMode }),
}))

const VERSION = '2026-10-14T15:00:00.000Z'
const ENDPOINT = '/api/solar-physics/lasce-section'

type User = ReturnType<typeof userEvent.setup>

const fetchMock = vi.fn()

function respond(status: number, body: unknown = {}) {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }))
}

function requestBody(call = 0) {
  const [, init] = fetchMock.mock.calls[call] ?? []
  return JSON.parse((init as RequestInit).body as string)
}

function renderSection(
  props: Partial<EditableLasceSectionProps> = {},
  { editMode = true, locale = 'es' as 'es' | 'en' } = {},
) {
  navigation.editMode = editMode
  vi.stubGlobal('fetch', fetchMock)
  renderWithIntl(
    <ToastProvider>
      <EditableLasceSection {...editorArgs} {...props} />
    </ToastProvider>,
    { locale },
  )
  return userEvent.setup()
}

function labelled(label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return screen.getByRole('textbox', { name: new RegExp(`^${escaped}`) })
}

async function openEditor(user: User, name = 'Editar la sección de LASCE') {
  await user.click(screen.getByRole('button', { name }))
}

async function changeSpanishTitle(user: User) {
  await user.clear(labelled('Título (Español)'))
  await user.type(labelled('Título (Español)'), 'Nuevo título')
  await user.click(screen.getByRole('tab', { name: /^English/ }))
  await user.clear(labelled('Título (English)'))
  await user.type(labelled('Título (English)'), 'New title')
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

describe('EditableLasceSection: reading', () => {
  test('shows the title and one paragraph per block of text', () => {
    renderSection({}, { editMode: false })

    expect(
      screen.getByRole('heading', { name: 'El trabajo de LASCE en Física Solar' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Primer párrafo.')).toBeInTheDocument()
    expect(screen.getByText('Segundo párrafo.')).toBeInTheDocument()
  })

  test('marks the paragraphs with the language they are in', () => {
    renderSection({ section: { ...editorArgs.section, contentLocale: null } }, { editMode: false })

    expect(screen.getByText('Primer párrafo.')).toHaveAttribute('lang', '')
  })

  test('offers no edit button outside "Modo edición"', () => {
    renderSection({}, { editMode: false })

    expect(screen.queryByRole('button', { name: 'Editar la sección de LASCE' })).toBeNull()
  })

  test('offers no edit button to someone who may not edit', () => {
    renderSection({ canEdit: false })

    expect(screen.queryByRole('button', { name: 'Editar la sección de LASCE' })).toBeNull()
  })

  test('offers no edit button without editing data', () => {
    const { editing: _editing, ...visitorView } = editorArgs.section

    renderSection({ section: visitorView })

    expect(screen.queryByRole('button', { name: 'Editar la sección de LASCE' })).toBeNull()
  })

  test('offers the edit button in "Modo edición" to an editor', () => {
    renderSection()

    expect(screen.getByRole('button', { name: 'Editar la sección de LASCE' })).toBeInTheDocument()
  })
})

describe('EditableLasceSection: saving', () => {
  test('opens a form with both languages in a modal', async () => {
    const user = renderSection()

    await openEditor(user)

    const dialog = screen.getByRole('dialog', { name: 'Editar la sección de LASCE' })
    expect(within(dialog).getByRole('textbox', { name: /^Título \(Español\)/ })).toHaveValue(
      'El trabajo de LASCE en Física Solar',
    )
  })

  test('sends both languages and the version, then confirms with a toast', async () => {
    const user = renderSection()
    respond(200, { section: editorArgs.section })

    await openEditor(user)
    await changeSpanishTitle(user)
    await save(user)

    expect(fetchMock).toHaveBeenCalledWith(ENDPOINT, expect.objectContaining({ method: 'PATCH' }))
    expect(requestBody()).toEqual({
      version: VERSION,
      content: {
        es: { title: 'Nuevo título', body: 'Primer párrafo.\n\nSegundo párrafo.' },
        en: { title: 'New title', body: 'First paragraph.\n\nSecond paragraph.' },
      },
    })
    expect(await screen.findByText('Sección actualizada correctamente.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(navigation.refresh).toHaveBeenCalled()
  })

  test('sends the explicit confirmation for a one-sided edit', async () => {
    const user = renderSection()
    respond(200, { section: editorArgs.section })

    await openEditor(user)
    await user.clear(labelled('Título (Español)'))
    await user.type(labelled('Título (Español)'), 'Nuevo título')
    await user.click(screen.getByRole('tab', { name: /^English/ }))
    await user.click(
      screen.getByRole('switch', { name: 'El título en inglés sigue siendo correcto' }),
    )
    await save(user)

    expect(requestBody().confirmedUnchanged).toEqual([{ locale: 'en', field: 'title' }])
  })

  test('closes without a request when nothing changed', async () => {
    const user = renderSection()

    await openEditor(user)
    await save(user)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('sends one request even if save is clicked twice while it is in flight', async () => {
    const user = renderSection()
    let finish: (response: Response) => void = () => {}
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => (finish = resolve)))

    await openEditor(user)
    await changeSpanishTitle(user)
    await save(user)
    await save(user)

    expect(fetchMock).toHaveBeenCalledTimes(1)

    finish(new Response(JSON.stringify({ section: editorArgs.section }), { status: 200 }))
    await vi.waitFor(() => expect(navigation.refresh).toHaveBeenCalled())
  })

  test('confirms in English when the site is shown in English', async () => {
    const user = renderSection({}, { locale: 'en' })
    respond(200, { section: editorArgs.section })

    await openEditor(user, 'Edit the LASCE section')
    await user.clear(labelled('Title (Español)'))
    await user.type(labelled('Title (Español)'), 'Nuevo título')
    await user.click(screen.getByRole('tab', { name: /^English/ }))
    await user.clear(labelled('Title (English)'))
    await user.type(labelled('Title (English)'), 'New title')
    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(await screen.findByText('Section updated successfully.')).toBeInTheDocument()
  })
})

describe('EditableLasceSection: failures keep the form open and the content unchanged', () => {
  test('explains a concurrent change in a toast and offers to reload', async () => {
    const user = renderSection()
    respond(409, { code: 'conflict', error: 'La sección cambió.' })

    await openEditor(user)
    await changeSpanishTitle(user)
    await save(user)

    expect(
      await screen.findByText(/Otra persona guardó cambios en esta sección/),
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(labelled('Título (English)')).toHaveValue('New title')
    expect(navigation.refresh).not.toHaveBeenCalled()
    expect(screen.queryByText('Sección actualizada correctamente.')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cerrar y cargar la versión actual' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(navigation.refresh).toHaveBeenCalled()
  })

  test('shows server validation errors under their field and in a toast', async () => {
    const user = renderSection()
    respond(400, {
      code: 'invalid-body',
      error: 'Faltan campos obligatorios o no son válidos.',
      issues: [{ path: 'content.en.body', message: 'El texto en inglés es obligatorio.' }],
    })

    await openEditor(user)
    await changeSpanishTitle(user)
    await save(user)

    expect(await screen.findByText('Revise los campos marcados.')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^English/ })).toHaveAttribute('aria-selected', 'true')
    expect(labelled('Texto (English)')).toHaveAccessibleDescription(
      'El texto en inglés es obligatorio.',
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  test('explains a missing permission and keeps the form', async () => {
    const user = renderSection()
    respond(403, { error: 'No tiene permisos para modificar este contenido.' })

    await openEditor(user)
    await changeSpanishTitle(user)
    await save(user)

    expect(
      await screen.findByText('No tiene permisos para modificar este contenido.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  test('says so when the request never got an answer', async () => {
    const user = renderSection()
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await openEditor(user)
    await changeSpanishTitle(user)
    await save(user)

    expect(
      await screen.findByText('No se pudo guardar el cambio. Inténtelo de nuevo.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(navigation.refresh).not.toHaveBeenCalled()
  })

  test('can be saved again after a failure', async () => {
    const user = renderSection()
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ code: 'internal-error', error: 'No se pudo guardar.' }), {
        status: 500,
      }),
    )
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ section: editorArgs.section }), { status: 200 }),
    )

    await openEditor(user)
    await changeSpanishTitle(user)
    await save(user)
    await screen.findByText('No se pudo guardar.')
    await save(user)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(await screen.findByText('Sección actualizada correctamente.')).toBeInTheDocument()
  })
})
