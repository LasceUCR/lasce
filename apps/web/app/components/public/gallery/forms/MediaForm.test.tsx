import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef, type ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { uploadGalleryImage } from '@/app/(public)/galeria/actions'
import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import { renderWithIntl } from '@/app/lib/i18n/testing'

import { MediaForm, type MediaFormHandle, type MediaFormProps } from './MediaForm'
import meta, { Create, Default, Legacy } from './MediaForm.stories'

vi.mock('@/app/(public)/galeria/actions', () => ({ uploadGalleryImage: vi.fn() }))

const editArgs = { ...meta.args, ...Default.args } as MediaFormProps
const createArgs = { ...meta.args, ...Create.args } as MediaFormProps
const legacyArgs = { ...meta.args, ...Legacy.args } as MediaFormProps

URL.createObjectURL = vi.fn(() => 'blob:mock-url')
URL.revokeObjectURL = vi.fn()

type User = ReturnType<typeof userEvent.setup>

function render(ui: ReactElement) {
  return renderWithIntl(<ToastProvider>{ui}</ToastProvider>)
}

function field(label: string) {
  return screen.getByRole('textbox', { name: new RegExp(`^${label.replace(/[()]/g, '\\$&')}`) })
}

function fileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')
  if (!input) throw new Error('The file input is missing.')
  return input
}

async function fillNewFile(user: User) {
  await user.type(field('Título (Español)'), 'Antena')
  await user.type(field('Descripción (Español)'), 'Vista de la antena')
  await user.type(field('Texto alternativo (Español)'), 'Antena parabólica')
  await user.click(screen.getByRole('tab', { name: /^English/ }))
  await user.type(field('Título (English)'), 'Antenna')
  await user.type(field('Descripción (English)'), 'View of the antenna')
  await user.type(field('Texto alternativo (English)'), 'Dish antenna')
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('MediaForm', () => {
  test('starts pre-filled with the stored text of the file', async () => {
    const user = userEvent.setup()
    render(<MediaForm {...editArgs} />)

    expect(field('Título (Español)')).toHaveValue('Antena del observatorio')
    expect(screen.getByLabelText(/^Fecha/)).toHaveValue('2024-03-12')

    await user.click(screen.getByRole('tab', { name: /^English/ }))
    expect(field('Título (English)')).toHaveValue('Observatory antenna')
  })

  test('reports the missing image and texts and sends nothing for an empty form', async () => {
    const user = userEvent.setup()
    render(<MediaForm {...createArgs} />)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.getByText('Se requiere subir un contenido.')).toBeInTheDocument()
    expect(screen.getByText('El título en español es obligatorio.')).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  test('uploads the image, posts the new file to its album and reports success', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    vi.mocked(uploadGalleryImage).mockResolvedValue({ ok: true, imageUrl: '/uploads/antena.png' })
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 201 }))
    const { container } = render(<MediaForm {...createArgs} onSaved={onSaved} />)

    await user.upload(fileInput(container), new File(['x'], 'antena.png', { type: 'image/png' }))
    await fillNewFile(user)
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce())
    expect(fetch).toHaveBeenCalledWith(
      '/api/gallery/albums/album-1/media',
      expect.objectContaining({ method: 'POST' }),
    )
    const init = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit
    expect(JSON.parse(init.body as string)).toMatchObject({
      objectKey: '/uploads/antena.png',
      format: 'PNG',
      isVideo: false,
      uploader: 'Ana Mora',
      content: {
        es: { title: 'Antena', description: 'Vista de la antena', altText: 'Antena parabólica' },
        en: { title: 'Antenna', description: 'View of the antenna', altText: 'Dish antenna' },
      },
    })
    expect(await screen.findByText('Imagen agregada correctamente.')).toBeInTheDocument()
  })

  test('patches an edited file with its version and without text when only the date changed', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }))
    render(<MediaForm {...editArgs} onSaved={onSaved} />)

    const date = screen.getByLabelText(/^Fecha/)
    await user.clear(date)
    await user.type(date, '2024-04-01')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce())
    expect(fetch).toHaveBeenCalledWith(
      '/api/gallery/media/media-1',
      expect.objectContaining({ method: 'PATCH' }),
    )
    const init = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit
    const body = JSON.parse(init.body as string) as Record<string, unknown>
    expect(body).toMatchObject({ version: '2024-03-12T15:00:00.000Z', date: '2024-04-01' })
    expect(body).not.toHaveProperty('content')
    expect(await screen.findByText('Imagen actualizada correctamente.')).toBeInTheDocument()
  })

  test('refuses to update a file whose version is unknown', async () => {
    const user = userEvent.setup()
    render(<MediaForm {...editArgs} version={undefined} />)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(
      await screen.findByText('No se pudo actualizar la imagen. Recargue la página.'),
    ).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  test('shows the server reason and keeps the form open when the save fails', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ error: 'El archivo cambió mientras lo editaba.' }, { status: 409 }),
    )
    render(<MediaForm {...editArgs} onSaved={onSaved} />)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('El archivo cambió mientras lo editaba.')).toBeInTheDocument()
    expect(onSaved).not.toHaveBeenCalled()
    expect(field('Título (Español)')).toBeInTheDocument()
  })

  test('shows the upload failure in a toast and sends nothing', async () => {
    const user = userEvent.setup()
    vi.mocked(uploadGalleryImage).mockResolvedValue({
      ok: false,
      error: 'La imagen supera el tamaño máximo.',
    })
    const { container } = render(<MediaForm {...createArgs} />)

    await user.upload(fileInput(container), new File(['x'], 'antena.png', { type: 'image/png' }))
    await fillNewFile(user)
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('La imagen supera el tamaño máximo.')).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  test('shows a message when the upload throws', async () => {
    const user = userEvent.setup()
    vi.mocked(uploadGalleryImage).mockRejectedValue(new Error('boom'))
    const { container } = render(<MediaForm {...createArgs} />)

    await user.upload(fileInput(container), new File(['x'], 'antena.png', { type: 'image/png' }))
    await fillNewFile(user)
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(
      await screen.findByText('No se pudo subir la imagen. Inténtelo de nuevo.'),
    ).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  test('explains that a legacy file has no English version', async () => {
    const user = userEvent.setup()
    render(<MediaForm {...legacyArgs} />)

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
      render(<MediaForm {...editArgs} onCancel={onCancel} />)

      await user.click(screen.getByRole('button', { name: 'Cancelar' }))

      expect(onCancel).toHaveBeenCalledOnce()
    })

    test('Cancelar asks first and only discards once confirmed', async () => {
      const user = userEvent.setup()
      const onCancel = vi.fn()
      render(<MediaForm {...editArgs} onCancel={onCancel} />)

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
      const ref = createRef<MediaFormHandle>()
      render(<MediaForm {...editArgs} onCancel={onCancel} ref={ref} />)

      await user.type(field('Título (Español)'), ' editado')
      ref.current?.requestCancel()

      expect(
        await screen.findByRole('dialog', { name: 'Descartar cambios no guardados' }),
      ).toBeInTheDocument()
      expect(onCancel).not.toHaveBeenCalled()
    })
  })
})
