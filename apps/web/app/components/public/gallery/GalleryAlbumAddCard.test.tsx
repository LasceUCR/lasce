import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { GalleryAlbumAddCard, type GalleryAlbumAddCardProps } from './GalleryAlbumAddCard'
import { Available } from './GalleryAlbumAddCard.stories'
import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

vi.mock('@/app/components/public/gallery/forms/AlbumForm', () => ({
  AlbumForm: ({
    onCancel,
    onSave,
  }: {
    onCancel: () => void
    onSave: (values: {
      title: string
      description: string
      yearsLabel: string
      coverObjectKey: string
    }) => void
  }) => (
    <div>
      <button
        onClick={() =>
          onSave({
            title: 'Álbum Nuevo',
            description: 'Descripción del álbum.',
            yearsLabel: '',
            coverObjectKey: 'gallery/albums/album-nuevo.jpg',
          })
        }
        type="button"
      >
        Guardar formulario
      </button>
      <button onClick={onCancel} type="button">
        Cancelar formulario
      </button>
    </div>
  ),
}))

const defaultArgs = Available.args as GalleryAlbumAddCardProps

function renderCard(props: GalleryAlbumAddCardProps = defaultArgs, editMode = true) {
  return render(
    <EditModeContext.Provider value={{ editMode, setEditMode: () => undefined }}>
      <GalleryAlbumAddCard {...props} />
    </EditModeContext.Provider>,
  )
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('GalleryAlbumAddCard', () => {
  test('shows the add-album prompt when edit mode and permission are enabled', () => {
    renderCard()

    expect(screen.getByRole('button', { name: 'Añadir álbum' })).toBeInTheDocument()
    expect(screen.getByRole('list')).toBeInTheDocument()
  })

  test('does not render without create permission', () => {
    renderCard({ canCreate: false })

    expect(screen.queryByRole('button', { name: 'Añadir álbum' })).not.toBeInTheDocument()
  })

  test('opens the create form in a modal', async () => {
    const user = userEvent.setup()
    renderCard()

    await user.click(screen.getByRole('button', { name: 'Añadir álbum' }))

    expect(screen.getByRole('dialog', { name: 'Añadir álbum' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar formulario' })).toBeInTheDocument()
  })

  test('posts the album, closes the modal, and refreshes the album list', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValue(new Response(null, { status: 201 }))
    renderCard()

    await user.click(screen.getByRole('button', { name: 'Añadir álbum' }))
    await user.click(screen.getByRole('button', { name: 'Guardar formulario' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/gallery/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: 'album-nuevo',
          title: 'Álbum Nuevo',
          description: 'Descripción del álbum.',
          yearsLabel: null,
          coverObjectKey: 'gallery/albums/album-nuevo.jpg',
        }),
      })
    })
    expect(mocks.refresh).toHaveBeenCalledOnce()

    expect(screen.queryByRole('dialog', { name: 'Añadir álbum' })).not.toBeInTheDocument()
  })

  test('shows the API error and keeps the modal open when creation fails', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ error: 'Ya existe un álbum con este slug.' }, { status: 409 }),
    )
    renderCard()

    await user.click(screen.getByRole('button', { name: 'Añadir álbum' }))
    await user.click(screen.getByRole('button', { name: 'Guardar formulario' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe un álbum con este slug.')
    expect(fetch).toHaveBeenCalledOnce()
    expect(mocks.refresh).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Añadir álbum' })).toBeInTheDocument()
  })

  test('does not render outside edit mode', () => {
    renderCard(defaultArgs, false)

    expect(screen.queryByRole('button', { name: 'Añadir álbum' })).not.toBeInTheDocument()
  })
})
