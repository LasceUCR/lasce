import { screen, waitFor, within } from '@testing-library/react'
import type { ReactElement } from 'react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import { renderWithIntl } from '@/app/lib/i18n/testing'

import { AlbumMediaGrid, type AlbumMediaGridProps } from './AlbumMediaGrid'
import { Default, SingleFile } from './AlbumMediaGrid.stories'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('@/app/(public)/galeria/actions', () => ({ uploadGalleryImage: vi.fn() }))

function render(ui: ReactElement) {
  return renderWithIntl(<ToastProvider>{ui}</ToastProvider>)
}

const defaultArgs = Default.args as AlbumMediaGridProps
const singleArgs = SingleFile.args as AlbumMediaGridProps

function fileAt(index: number) {
  const item = defaultArgs.media[index]

  if (!item) {
    throw new Error(`The story fixture has no file at index ${index}.`)
  }

  return item
}

const first = fileAt(0)
const second = fileAt(1)
const last = fileAt(defaultArgs.media.length - 1)

function openTile(title: string) {
  return screen.getByRole('button', { name: `Ver a tamaño completo: ${title}` })
}

// jsdom does not implement `showModal`, so stub it to exercise the same path
// a browser takes.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '')
  })
})

describe('AlbumMediaGrid', () => {
  test('presents the files of the album as one list', () => {
    render(<AlbumMediaGrid {...defaultArgs} />)

    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(defaultArgs.media.length)
  })

  // Each tile already has a control that names the file, so a described image
  // beside it would make a reader say the same thing twice.
  test('leaves the tile images out of the accessibility tree', () => {
    render(<AlbumMediaGrid {...defaultArgs} />)

    expect(screen.queryAllByRole('img')).toHaveLength(0)
  })

  test('tells the visitor which file of the album is open', async () => {
    const user = userEvent.setup()
    render(<AlbumMediaGrid {...defaultArgs} />)

    await user.click(openTile(second.title))

    const dialog = screen.getByRole('dialog')
    const total = defaultArgs.media.length
    expect(within(dialog).getByText(`2 / ${total}`)).toBeInTheDocument()
    expect(within(dialog).getByText(`Archivo 2 de ${total}`)).toBeInTheDocument()
  })

  test('describes the open file with its own alternative text', async () => {
    const user = userEvent.setup()
    render(<AlbumMediaGrid {...defaultArgs} />)

    await user.click(openTile(second.title))

    expect(screen.getByRole('img', { name: second.alt })).toBeInTheDocument()
  })

  test('offers one full-size control per file, named after it', () => {
    render(<AlbumMediaGrid {...defaultArgs} />)

    for (const item of defaultArgs.media) {
      expect(openTile(item.title)).toBeInTheDocument()
    }
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('shows edit and delete controls for each file when edit mode and grants are enabled', () => {
    render(<AlbumMediaGrid {...defaultArgs} canDelete canEdit editMode />)

    expect(screen.getAllByRole('button', { name: /^Editar / })).toHaveLength(
      defaultArgs.media.length,
    )
    expect(screen.getAllByRole('button', { name: /^Eliminar / })).toHaveLength(
      defaultArgs.media.length,
    )
  })

  test('shows an add-file card when edit mode and create permission are enabled', () => {
    render(<AlbumMediaGrid {...defaultArgs} albumId="album-1" canCreate editMode uploader="Ana" />)

    expect(screen.getByRole('button', { name: 'Añadir imagen' })).toBeInTheDocument()
  })

  test('opens the media form for the album and reports missing fields on submit', async () => {
    const user = userEvent.setup()
    render(<AlbumMediaGrid {...defaultArgs} albumId="album-1" canCreate editMode uploader="Ana" />)

    await user.click(screen.getByRole('button', { name: 'Añadir imagen' }))
    expect(screen.getByRole('dialog', { name: 'Añadir imagen' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.getByText('Se requiere subir un contenido.')).toBeInTheDocument()
    expect(screen.getByText('El título en español es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('El texto alternativo en español es obligatorio.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  test('hides the add-file card when the album or the user is unknown', () => {
    render(<AlbumMediaGrid {...defaultArgs} canCreate editMode />)

    expect(screen.queryByRole('button', { name: 'Añadir imagen' })).not.toBeInTheDocument()
  })

  test('deletes a file through the API after confirming', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    render(<AlbumMediaGrid {...defaultArgs} canDelete editMode />)

    await user.click(screen.getByRole('button', { name: `Eliminar ${first.title}` }))
    const dialog = screen.getByRole('dialog', { name: 'Eliminar imagen' })
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

    expect(fetchMock).toHaveBeenCalledWith(`/api/gallery/media/${first.id}`, { method: 'DELETE' })
    vi.unstubAllGlobals()
  })

  test('labels a video so it is not distinguished by its icon alone', () => {
    render(<AlbumMediaGrid {...defaultArgs} />)

    expect(screen.getAllByText('Video')).toHaveLength(1)
  })

  test('opens the chosen file in the lightbox with its metadata', async () => {
    const user = userEvent.setup()
    render(<AlbumMediaGrid {...defaultArgs} />)

    await user.click(openTile(second.title))

    const dialog = screen.getByRole('dialog')
    expect(
      within(dialog).getByRole('heading', { level: 2, name: second.title }),
    ).toBeInTheDocument()
    expect(within(dialog).getByText(`Formato: ${second.format}`)).toBeInTheDocument()
    expect(within(dialog).getByText(`Subido por: ${second.uploader}`)).toBeInTheDocument()
  })

  test('wraps around when paging past either end of the album', async () => {
    const user = userEvent.setup()
    render(<AlbumMediaGrid {...defaultArgs} />)

    await user.click(openTile(first.title))
    await user.click(screen.getByRole('button', { name: 'Anterior' }))

    expect(screen.getByRole('heading', { level: 2, name: last.title })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Siguiente' }))

    expect(screen.getByRole('heading', { level: 2, name: first.title })).toBeInTheDocument()
  })

  test('closes on Escape and returns focus to the tile that opened it', async () => {
    const user = userEvent.setup()
    render(<AlbumMediaGrid {...defaultArgs} />)

    await user.click(openTile(second.title))
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(openTile(second.title)).toHaveFocus()
  })

  test('keeps the arrows working for an album with a single file', async () => {
    const user = userEvent.setup()
    render(<AlbumMediaGrid {...singleArgs} />)

    await user.click(openTile(first.title))
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))

    expect(screen.getByRole('heading', { level: 2, name: first.title })).toBeInTheDocument()
  })

  test('renders no full-size buttons when an album has no media', () => {
    render(<AlbumMediaGrid albumTitle="Categoría vacía" media={[]} />)

    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  test('allows creating the first file when an empty album is in edit mode', () => {
    render(
      <AlbumMediaGrid
        albumId="album-1"
        albumTitle="Categoría vacía"
        canCreate
        editMode
        media={[]}
        uploader="Ana"
      />,
    )

    expect(screen.getByRole('button', { name: 'Añadir imagen' })).toBeInTheDocument()
  })

  describe('unsaved changes in the file form', () => {
    async function openDirtyForm() {
      const user = userEvent.setup()
      render(
        <AlbumMediaGrid {...defaultArgs} albumId="album-1" canCreate editMode uploader="Ana" />,
      )
      await user.click(screen.getByRole('button', { name: 'Añadir imagen' }))
      await user.type(screen.getByLabelText(/Título \(Español\)/), 'Aurora')
      return user
    }

    test('asks before discarding when Escape is pressed', async () => {
      const user = await openDirtyForm()

      await user.keyboard('{Escape}')

      expect(screen.getByText('Descartar cambios no guardados')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Seguir editando' }))
      expect(screen.getByLabelText(/Título \(Español\)/)).toHaveValue('Aurora')
    })

    test('asks before discarding when Cancelar is pressed', async () => {
      const user = await openDirtyForm()

      await user.click(screen.getByRole('button', { name: 'Cancelar' }))
      await user.click(screen.getByRole('button', { name: 'Descartar' }))

      expect(screen.queryByLabelText(/Título \(Español\)/)).not.toBeInTheDocument()
    })

    test('closes without asking when nothing changed', async () => {
      const user = userEvent.setup()
      render(
        <AlbumMediaGrid {...defaultArgs} albumId="album-1" canCreate editMode uploader="Ana" />,
      )
      await user.click(screen.getByRole('button', { name: 'Añadir imagen' }))

      await user.click(screen.getByRole('button', { name: 'Cancelar' }))

      expect(screen.queryByText('Descartar cambios no guardados')).not.toBeInTheDocument()
      await waitFor(() =>
        expect(screen.queryByLabelText(/Título \(Español\)/)).not.toBeInTheDocument(),
      )
    })
  })
})
