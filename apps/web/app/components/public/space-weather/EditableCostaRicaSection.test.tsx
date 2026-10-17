import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'
import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import { renderWithIntl } from '@/app/lib/i18n/testing'

import {
  EditableCostaRicaSection,
  type EditableCostaRicaSectionProps,
} from './EditableCostaRicaSection'
import { EditModeOn, ViewMode, WithoutPermission } from './EditableCostaRicaSection.stories'

const router = vi.hoisted(() => ({ refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))

const editArgs = EditModeOn.args as EditableCostaRicaSectionProps
const EDIT_LABEL = 'Editar la sección «¿Por qué estudiarlo desde Costa Rica?»'
const DIALOG_TITLE = 'Editar «¿Por qué estudiarlo desde Costa Rica?»'
const fetchMock = vi.fn()

function renderSection(
  props: EditableCostaRicaSectionProps,
  { editMode = true, locale = 'es' }: { editMode?: boolean; locale?: 'es' | 'en' } = {},
) {
  renderWithIntl(
    <ToastProvider>
      <EditModeContext.Provider value={{ editMode, setEditMode: () => {} }}>
        <EditableCostaRicaSection {...props} />
      </EditModeContext.Provider>
    </ToastProvider>,
    { locale },
  )
  return userEvent.setup()
}

function answer(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status })
}

/** Opens the editor and changes the text in both languages. */
async function editBothBodies(
  user: ReturnType<typeof userEvent.setup>,
  locale: 'es' | 'en' = 'es',
) {
  const label = locale === 'es' ? 'Texto' : 'Text'
  await user.click(
    screen.getByRole('button', {
      name: locale === 'es' ? EDIT_LABEL : 'Edit the “Why study it from Costa Rica?” section',
    }),
  )
  await user.type(screen.getByRole('textbox', { name: `${label} (Español)` }), ' Más.')
  await user.click(screen.getByRole('tab', { name: /English/ }))
  await user.type(screen.getByRole('textbox', { name: `${label} (English)` }), ' More.')
  await user.click(screen.getByRole('button', { name: locale === 'es' ? 'Confirmar' : 'Confirm' }))
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('EditableCostaRicaSection', () => {
  test('is the plain card with edit mode off', () => {
    renderSection(ViewMode.args as EditableCostaRicaSectionProps, { editMode: false })

    expect(
      screen.getByRole('heading', { level: 2, name: editArgs.section.title }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: EDIT_LABEL })).not.toBeInTheDocument()
  })

  test('is the plain card for an account that cannot edit', () => {
    renderSection(WithoutPermission.args as EditableCostaRicaSectionProps)

    expect(screen.queryByRole('button', { name: EDIT_LABEL })).not.toBeInTheDocument()
  })

  test('offers to edit the card but never to delete it', () => {
    renderSection(editArgs)

    expect(screen.getByRole('button', { name: EDIT_LABEL })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
  })

  test('saves both languages, closes the editor and says so in a toast', async () => {
    fetchMock.mockResolvedValue(answer(200, { section: editArgs.section }))
    const user = renderSection(editArgs)

    await editBothBodies(user)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/space-weather/costa-rica')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body as string)).toEqual({
      version: editArgs.section.editing?.version,
      content: {
        es: {
          title: editArgs.section.editing?.content.es.title,
          body: `${editArgs.section.editing?.content.es.body} Más.`,
        },
        en: {
          title: editArgs.section.editing?.content.en?.title,
          body: `${editArgs.section.editing?.content.en?.body} More.`,
        },
      },
    })
    expect(await screen.findByText('Sección actualizada correctamente.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(router.refresh).toHaveBeenCalled()
  })

  test('closes without a request when nothing changed', async () => {
    const user = renderSection(editArgs)

    await user.click(screen.getByRole('button', { name: EDIT_LABEL }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('sends one save at a time', async () => {
    let respond: (response: Response) => void = () => {}
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        respond = resolve
      }),
    )
    const user = renderSection(editArgs)

    await editBothBodies(user)
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    respond(answer(409, { code: 'conflict', error: 'La sección cambió desde que la abrió.' }))
    expect(await screen.findByText('La sección cambió desde que la abrió.')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test("keeps the editor open with the server's reason in a toast inside it", async () => {
    fetchMock.mockResolvedValue(
      answer(409, { code: 'conflict', error: 'La sección cambió desde que la abrió.' }),
    )
    const user = renderSection(editArgs)

    await editBothBodies(user)

    const dialog = await screen.findByRole('dialog', { name: DIALOG_TITLE })
    expect(
      await within(dialog).findByText('La sección cambió desde que la abrió.'),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole('textbox', { name: 'Texto (English)', hidden: true }),
    ).toHaveValue(`${editArgs.section.editing?.content.en?.body} More.`)
    expect(router.refresh).not.toHaveBeenCalled()
  })

  test('says a request that never reached the server could not be sent', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'))
    const user = renderSection(editArgs)

    await editBothBodies(user)

    expect(
      await screen.findByText(
        'No se pudo conectar con el servidor. Revise su conexión e inténtelo de nuevo.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  test('falls back to its own message for a failure that gives no reason', async () => {
    fetchMock.mockResolvedValue(new Response('<html></html>', { status: 400 }))
    const user = renderSection(editArgs)

    await editBothBodies(user)

    expect(
      await screen.findByText('No se pudo guardar la sección. Inténtelo de nuevo.'),
    ).toBeInTheDocument()
  })

  test('reports the outcome in English for an editor reading the site in English', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 500 }))
    const user = renderSection(editArgs, { locale: 'en' })

    await editBothBodies(user, 'en')
    expect(
      await screen.findByText(
        'The server could not complete the operation. Try again in a few minutes.',
      ),
    ).toBeInTheDocument()

    fetchMock.mockResolvedValueOnce(answer(200, { section: editArgs.section }))
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    await waitFor(() =>
      expect(screen.getByText('Section updated successfully.')).toBeInTheDocument(),
    )
  })
})
