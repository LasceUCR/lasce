import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'
import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import { renderWithIntl } from '@/app/lib/i18n/testing'

import { GeomagneticIndicators, type GeomagneticIndicatorsProps } from './GeomagneticIndicators'
import { CatalogueFallback, EditModeOn, ViewMode } from './GeomagneticIndicators.stories'

const router = vi.hoisted(() => ({ refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))

const editArgs = EditModeOn.args as GeomagneticIndicatorsProps
const ids = editArgs.indicators.map((indicator) => indicator.id)
const fetchMock = vi.fn()

function renderSection(
  props: GeomagneticIndicatorsProps,
  { editMode = true, locale = 'es' }: { editMode?: boolean; locale?: 'es' | 'en' } = {},
) {
  renderWithIntl(
    <ToastProvider>
      <EditModeContext.Provider value={{ editMode, setEditMode: () => {} }}>
        <GeomagneticIndicators {...props} />
      </EditModeContext.Provider>
    </ToastProvider>,
    { locale },
  )
  return userEvent.setup()
}

function answer(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status })
}

function cardLabels() {
  return screen.getAllByRole('article').map((card) => within(card).getByText(/^Índice/).textContent)
}

/**
 * jsdom lays nothing out, and dnd-kit moves a card by comparing rectangles. Each sortable card
 * gets a slot in one row by its place among its siblings, so the keyboard sensor has somewhere
 * to move it; everything inside a card shares the card's rectangle.
 */
function layOutCardsInARow() {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const card = this.closest('.editable')
    const index = card?.parentElement ? Array.from(card.parentElement.children).indexOf(card) : 0
    const left = Math.max(index, 0) * 200
    return {
      x: left,
      y: 0,
      left,
      top: 0,
      right: left + 180,
      bottom: 80,
      width: card ? 180 : 0,
      height: card ? 80 : 0,
      toJSON: () => ({}),
    } as DOMRect
  })
}

async function moveFirstCardRight(
  user: ReturnType<typeof userEvent.setup>,
  handle = 'Reordenar Índice Kp',
) {
  screen.getByRole('button', { name: handle }).focus()
  await user.keyboard(' ')
  await user.keyboard('{ArrowRight}')
  await user.keyboard(' ')
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('GeomagneticIndicators', () => {
  test('shows every index with its value and description, without controls, to a visitor', () => {
    renderSection(ViewMode.args as GeomagneticIndicatorsProps, { editMode: false })

    expect(
      screen.getByRole('heading', { name: 'Índices geomagnéticos de Costa Rica' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Datos de demostración')).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(4)
    expect(screen.getAllByRole('article')[1]).toHaveTextContent('-12 nT · Estable')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  test('stays read-only for the catalogue fallback, even in edit mode', () => {
    renderSection(CatalogueFallback.args as GeomagneticIndicatorsProps)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  test('stays read-only for an account that cannot edit', () => {
    renderSection({ ...editArgs, canEdit: false })

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  test('offers to edit and reorder each index in edit mode, never to delete or add one', () => {
    renderSection(editArgs)

    for (const label of ['Índice Kp', 'Índice Dst', 'Índice AE', 'Índice Ap']) {
      expect(screen.getByRole('button', { name: `Editar ${label}` })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: `Reordenar ${label}` })).toBeInTheDocument()
    }
    expect(screen.queryByRole('button', { name: /Eliminar|Agregar/ })).not.toBeInTheDocument()
  })

  test('offers no reorder handle for indices that come without a position', () => {
    renderSection({
      ...editArgs,
      indicators: editArgs.indicators.map(({ position: _position, ...indicator }) => indicator),
    })

    expect(screen.getByRole('button', { name: 'Editar Índice Kp' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Reordenar/ })).not.toBeInTheDocument()
  })

  test('saves an edited value and says so in a toast', async () => {
    fetchMock.mockResolvedValue(answer(200, { indicator: null }))
    const user = renderSection(editArgs)

    await user.click(screen.getByRole('button', { name: 'Editar Índice Dst' }))
    const dialog = screen.getByRole('dialog', { name: 'Editar Índice Dst' })
    await user.clear(within(dialog).getByRole('textbox', { name: 'Valor' }))
    await user.type(within(dialog).getByRole('textbox', { name: 'Valor' }), '-40 nT')
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`/api/home/indicators/${ids[1]}`)
    expect(JSON.parse(init.body as string)).toEqual({
      version: editArgs.indicators[1]?.editing?.version,
      value: '-40 nT',
    })
    expect(
      await screen.findByText('Índice geomagnético actualizado correctamente.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(router.refresh).toHaveBeenCalled()
  })

  test("keeps the editor open with the server's reason in a toast when it refuses the save", async () => {
    fetchMock.mockResolvedValue(
      answer(409, { code: 'conflict', error: 'El índice cambió desde que lo abrió.' }),
    )
    const user = renderSection(editArgs)

    await user.click(screen.getByRole('button', { name: 'Editar Índice Kp' }))
    const dialog = screen.getByRole('dialog', { name: 'Editar Índice Kp' })
    await user.type(within(dialog).getByRole('textbox', { name: 'Valor' }), '0')
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

    expect(
      await within(dialog).findByText('El índice cambió desde que lo abrió.'),
    ).toBeInTheDocument()
    expect(within(dialog).getByRole('textbox', { name: 'Valor' })).toHaveValue('20')
  })

  test('saves a new order as soon as a card is dropped, with the keyboard', async () => {
    layOutCardsInARow()
    fetchMock.mockResolvedValue(answer(200, { ids: [] }))
    const user = renderSection(editArgs)

    await moveFirstCardRight(user)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/home/indicators')
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body as string)).toEqual({
      ids: [ids[1], ids[0], ids[2], ids[3]],
      positionField: 'position',
    })
    expect(cardLabels()).toEqual(['Índice Dst', 'Índice Kp', 'Índice AE', 'Índice Ap'])
    expect(
      await screen.findByText('Orden de los índices actualizado correctamente.'),
    ).toBeInTheDocument()
    expect(router.refresh).toHaveBeenCalled()
  })

  test('puts the cards back where they were when the order cannot be saved', async () => {
    layOutCardsInARow()
    fetchMock.mockResolvedValue(
      answer(409, { code: 'conflict', error: 'Los índices geomagnéticos cambiaron.' }),
    )
    const user = renderSection(editArgs)

    await moveFirstCardRight(user)

    expect(await screen.findByText('Los índices geomagnéticos cambiaron.')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(cardLabels()).toEqual(['Índice Kp', 'Índice Dst', 'Índice AE', 'Índice Ap'])
    expect(router.refresh).not.toHaveBeenCalled()
  })
})
