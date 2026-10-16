import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'
import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import { renderWithIntl } from '@/app/lib/i18n/testing'

import { EditableHomeHero, type EditableHomeHeroProps } from './EditableHomeHero'
import { EditModeOn, ViewMode, WithoutPermission } from './EditableHomeHero.stories'

const router = vi.hoisted(() => ({ refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))

const editArgs = EditModeOn.args as EditableHomeHeroProps
const fetchMock = vi.fn()

function renderHero(
  props: EditableHomeHeroProps,
  { editMode = true, locale = 'es' }: { editMode?: boolean; locale?: 'es' | 'en' } = {},
) {
  renderWithIntl(
    <ToastProvider>
      <EditModeContext.Provider value={{ editMode, setEditMode: () => {} }}>
        <EditableHomeHero {...props} />
      </EditModeContext.Provider>
    </ToastProvider>,
    { locale },
  )
  return userEvent.setup()
}

function answer(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status })
}

/** Opens the editor and changes the subtitle in both languages. */
async function editBothLeads(user: ReturnType<typeof userEvent.setup>, locale: 'es' | 'en' = 'es') {
  const label = locale === 'es' ? 'Subtítulo' : 'Subtitle'
  await user.click(
    screen.getByRole('button', { name: locale === 'es' ? 'Editar portada' : 'Edit hero banner' }),
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

describe('EditableHomeHero', () => {
  test('is the plain banner with edit mode off', () => {
    renderHero(ViewMode.args as EditableHomeHeroProps, { editMode: false })

    expect(screen.getByRole('heading', { level: 1, name: editArgs.hero.title })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar portada' })).not.toBeInTheDocument()
  })

  test('is the plain banner for an account that cannot edit', () => {
    renderHero(WithoutPermission.args as EditableHomeHeroProps)

    expect(screen.queryByRole('button', { name: 'Editar portada' })).not.toBeInTheDocument()
  })

  test('offers to edit the banner but never to delete it', () => {
    renderHero(editArgs)

    expect(screen.getByRole('button', { name: 'Editar portada' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
  })

  test('saves both languages, closes the editor and says so in a toast', async () => {
    fetchMock.mockResolvedValue(answer(200, { hero: editArgs.hero }))
    const user = renderHero(editArgs)

    await editBothLeads(user)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/home/hero')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body as string)).toEqual({
      version: editArgs.hero.editing?.version,
      content: {
        es: {
          title: editArgs.hero.editing?.content.es.title,
          lead: `${editArgs.hero.editing?.content.es.lead} Más.`,
        },
        en: {
          title: editArgs.hero.editing?.content.en?.title,
          lead: `${editArgs.hero.editing?.content.en?.lead} More.`,
        },
      },
    })
    expect(await screen.findByText('Portada actualizada correctamente.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(router.refresh).toHaveBeenCalled()
  })

  test('closes without a request when nothing changed', async () => {
    const user = renderHero(editArgs)

    await user.click(screen.getByRole('button', { name: 'Editar portada' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test("keeps the editor open with the server's reason in a toast inside it", async () => {
    fetchMock.mockResolvedValue(
      answer(409, { code: 'conflict', error: 'La portada cambió desde que la abrió.' }),
    )
    const user = renderHero(editArgs)

    await editBothLeads(user)

    const dialog = await screen.findByRole('dialog', { name: 'Editar portada' })
    expect(
      await within(dialog).findByText('La portada cambió desde que la abrió.'),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole('textbox', { name: 'Subtítulo (English)', hidden: true }),
    ).toHaveValue(`${editArgs.hero.editing?.content.en?.lead} More.`)
    expect(router.refresh).not.toHaveBeenCalled()
  })

  test('says a request that never reached the server could not be sent', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'))
    const user = renderHero(editArgs)

    await editBothLeads(user)

    expect(
      await screen.findByText(
        'No se pudo conectar con el servidor. Revise su conexión e inténtelo de nuevo.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  test('falls back to its own message for a failure that gives no reason', async () => {
    fetchMock.mockResolvedValue(new Response('<html></html>', { status: 400 }))
    const user = renderHero(editArgs)

    await editBothLeads(user)

    expect(
      await screen.findByText('No se pudo guardar la portada. Inténtelo de nuevo.'),
    ).toBeInTheDocument()
  })

  test('reports the outcome in English for an editor reading the site in English', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 500 }))
    const user = renderHero(editArgs, { locale: 'en' })

    await editBothLeads(user, 'en')
    expect(
      await screen.findByText(
        'The server could not complete the operation. Try again in a few minutes.',
      ),
    ).toBeInTheDocument()

    fetchMock.mockResolvedValueOnce(answer(200, { hero: editArgs.hero }))
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    await waitFor(() =>
      expect(screen.getByText('Hero banner updated successfully.')).toBeInTheDocument(),
    )
  })
})
