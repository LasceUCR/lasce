import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef, type ReactElement } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { uploadGalleryImage } from '@/app/(public)/galeria/actions'
import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import { renderWithIntl } from '@/app/lib/i18n/testing'

import { AlbumForm, type AlbumFormHandle, type AlbumFormProps } from './AlbumForm'
import meta, { Create, Default, Legacy } from './AlbumForm.stories'

vi.mock('@/app/(public)/galeria/actions', () => ({ uploadGalleryImage: vi.fn() }))

const editArgs = { ...meta.args, ...Default.args } as AlbumFormProps
const createArgs = { ...meta.args, ...Create.args } as AlbumFormProps
const legacyArgs = { ...meta.args, ...Legacy.args } as AlbumFormProps

URL.createObjectURL = vi.fn(() => 'blob:mock-url')
URL.revokeObjectURL = vi.fn()

type User = ReturnType<typeof userEvent.setup>

function render(ui: ReactElement) {
  return renderWithIntl(<ToastProvider>{ui}</ToastProvider>)
}

function field(label: string) {
  return screen.getByRole('textbox', { name: new RegExp(`^${label.replace(/[()]/g, '\\$&')}`) })
}

function coverInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')
  if (!input) throw new Error('The cover input is missing.')
  return input
}

async function fillNewAlbum(user: User, title = 'Álbum nuevo') {
  await user.type(field('Título (Español)'), title)
  await user.type(field('Descripción (Español)'), 'Descripción nueva')
  await user.click(screen.getByRole('tab', { name: /^English/ }))
  await user.type(field('Título (English)'), 'New album')
  await user.type(field('Descripción (English)'), 'New description')
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AlbumForm', () => {
  test('starts pre-filled with the stored text and the years label', async () => {
    const user = userEvent.setup()
    render(<AlbumForm {...editArgs} />)

    expect(field('Título (Español)')).toHaveValue('Observatorio ROSAC')
    expect(screen.getByRole('textbox', { name: 'Años' })).toHaveValue('2019–2023')

    await user.click(screen.getByRole('tab', { name: /^English/ }))
    expect(field('Título (English)')).toHaveValue('ROSAC Observatory')
  })

  test('saves only the shared fields when the text was not touched', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<AlbumForm {...editArgs} onSave={onSave} />)

    await user.clear(screen.getByRole('textbox', { name: 'Años' }))
    await user.type(screen.getByRole('textbox', { name: 'Años' }), '2020')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce())
    const [values] = onSave.mock.calls[0] as [Record<string, unknown>]
    expect(values).toMatchObject({
      yearsLabel: '2020',
      coverObjectKey: '/images/galeria/rosac/8.jpg',
    })
    expect(values).not.toHaveProperty('content')
    expect(uploadGalleryImage).not.toHaveBeenCalled()
  })

  test('reports the missing cover and texts and does not save an empty album', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<AlbumForm {...createArgs} onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.getByText('Se requiere una imagen de portada para el álbum.')).toBeInTheDocument()
    expect(screen.getByText('El título en español es obligatorio.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('uploads the cover and saves the new album in both languages', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    vi.mocked(uploadGalleryImage).mockResolvedValue({ ok: true, imageUrl: '/uploads/portada.jpg' })
    const { container } = render(<AlbumForm {...createArgs} onSave={onSave} />)

    await user.upload(coverInput(container), new File(['x'], 'portada.jpg', { type: 'image/jpeg' }))
    await fillNewAlbum(user)
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce())
    expect(onSave.mock.calls[0]?.[0]).toMatchObject({
      title: 'Álbum nuevo',
      coverObjectKey: '/uploads/portada.jpg',
      content: {
        es: { title: 'Álbum nuevo', description: 'Descripción nueva' },
        en: { title: 'New album', description: 'New description' },
      },
    })
  })

  test('shows the upload failure in a toast and does not save', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    vi.mocked(uploadGalleryImage).mockResolvedValue({
      ok: false,
      error: 'La imagen supera el tamaño máximo.',
    })
    const { container } = render(<AlbumForm {...createArgs} onSave={onSave} />)

    await user.upload(coverInput(container), new File(['x'], 'portada.jpg', { type: 'image/jpeg' }))
    await fillNewAlbum(user)
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('La imagen supera el tamaño máximo.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('shows a translated message when the upload throws', async () => {
    const user = userEvent.setup()
    vi.mocked(uploadGalleryImage).mockRejectedValue(new Error('boom'))
    const { container } = render(<AlbumForm {...createArgs} />)

    await user.upload(coverInput(container), new File(['x'], 'portada.jpg', { type: 'image/jpeg' }))
    await fillNewAlbum(user)
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(
      await screen.findByText('No se pudo subir la imagen. Inténtelo de nuevo.'),
    ).toBeInTheDocument()
  })

  test('asks for letters or numbers in the title next to the field when a slug is required', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    const { container } = render(<AlbumForm {...createArgs} onSave={onSave} />)

    await user.upload(coverInput(container), new File(['x'], 'portada.jpg', { type: 'image/jpeg' }))
    await fillNewAlbum(user, '!!!')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(
      screen.getByText('El título debe incluir letras o números para generar el identificador.'),
    ).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('explains that a legacy album has no English version', async () => {
    const user = userEvent.setup()
    render(<AlbumForm {...legacyArgs} />)

    expect(
      screen.getByText(/se registró antes de que existieran las versiones/),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /^English/ }))
    expect(screen.getByText(/aún no tiene versión en inglés/)).toBeInTheDocument()
  })

  describe('leaving with unsaved changes', () => {
    test('Cancelar closes straight away when nothing changed', async () => {
      const user = userEvent.setup()
      const onCancel = vi.fn()
      render(<AlbumForm {...editArgs} onCancel={onCancel} />)

      await user.click(screen.getByRole('button', { name: 'Cancelar' }))

      expect(onCancel).toHaveBeenCalledOnce()
    })

    test('Cancelar asks first and only discards once confirmed', async () => {
      const user = userEvent.setup()
      const onCancel = vi.fn()
      render(<AlbumForm {...editArgs} onCancel={onCancel} />)

      await user.type(field('Título (Español)'), ' editado')
      await user.click(screen.getByRole('button', { name: 'Cancelar' }))
      expect(onCancel).not.toHaveBeenCalled()

      await user.click(screen.getByRole('button', { name: 'Seguir editando' }))
      expect(onCancel).not.toHaveBeenCalled()

      await user.click(screen.getByRole('button', { name: 'Cancelar' }))
      await user.click(screen.getByRole('button', { name: 'Descartar' }))
      expect(onCancel).toHaveBeenCalledOnce()
    })

    test('requestCancel on the handle asks the same way', async () => {
      const user = userEvent.setup()
      const onCancel = vi.fn()
      const ref = createRef<AlbumFormHandle>()
      render(<AlbumForm {...editArgs} onCancel={onCancel} ref={ref} />)

      await user.type(field('Título (Español)'), ' editado')
      ref.current?.requestCancel()

      expect(
        await screen.findByRole('dialog', { name: 'Descartar cambios no guardados' }),
      ).toBeInTheDocument()
      expect(onCancel).not.toHaveBeenCalled()
    })
  })
})
