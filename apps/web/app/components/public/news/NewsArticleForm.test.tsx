import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  uploadNewsImage: vi.fn(),
}))

vi.mock('@/app/(public)/noticias/actions', () => ({
  uploadNewsImage: mocks.uploadNewsImage,
}))

import { NewsArticleForm, type NewsArticleFormProps } from './NewsArticleForm'
import { AddNew, EditExisting } from './NewsArticleForm.stories'

const editArgs = EditExisting.args as NewsArticleFormProps
const addArgs = AddNew.args as NewsArticleFormProps

// jsdom has no `URL.createObjectURL`; `FileDropInput` calls it for its own local preview.
URL.createObjectURL = vi.fn(() => 'blob:mock-url')
URL.revokeObjectURL = vi.fn()

describe('NewsArticleForm', () => {
  test('pre-fills every field from the article it is given', () => {
    render(<NewsArticleForm {...editArgs} />)

    const article = editArgs.article!
    expect(screen.getByRole('textbox', { name: 'Título' })).toHaveValue(article.title)
    expect(screen.getByRole('textbox', { name: 'Autores' })).toHaveValue(article.authors)
    expect(screen.getByRole('img')).toHaveAttribute('src', article.imageUrl)
  })

  test('saves the edited fields, keeping the original image', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<NewsArticleForm {...editArgs} onSave={onSave} />)

    await user.clear(screen.getByRole('textbox', { name: 'Título' }))
    await user.type(screen.getByRole('textbox', { name: 'Título' }), 'Nuevo título')

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Nuevo título',
        authors: [editArgs.article!.authors],
        imageUrl: editArgs.article!.imageUrl,
      }),
    )
  })

  test('splits a comma-separated author list into an array', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<NewsArticleForm {...editArgs} onSave={onSave} />)

    await user.clear(screen.getByRole('textbox', { name: 'Autores' }))
    await user.type(screen.getByRole('textbox', { name: 'Autores' }), 'Ana Pérez, Beto Ruiz')

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ authors: ['Ana Pérez', 'Beto Ruiz'] }),
    )
  })

  test('calls onCancel without saving', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const onSave = vi.fn()
    render(<NewsArticleForm {...editArgs} onCancel={onCancel} onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onSave).not.toHaveBeenCalled()
  })

  test('uploads a freshly dropped file and saves with the returned public URL', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    mocks.uploadNewsImage.mockResolvedValue({
      ok: true,
      imageUrl: 'https://s3.example/lasce/123_nueva.png',
    })
    render(<NewsArticleForm {...editArgs} onSave={onSave} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['imagen'], 'nueva.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(mocks.uploadNewsImage).toHaveBeenCalledTimes(1)
    const formData = mocks.uploadNewsImage.mock.calls[0]![0] as FormData
    expect((formData.get('file') as File).name).toBe('nueva.png')
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ imageUrl: 'https://s3.example/lasce/123_nueva.png' }),
    )
  })

  test('shows the error and does not save when the upload fails', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    mocks.uploadNewsImage.mockResolvedValue({ ok: false, error: 'La imagen es demasiado grande.' })
    render(<NewsArticleForm {...editArgs} onSave={onSave} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['imagen'], 'nueva.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('La imagen es demasiado grande.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('recovers the button and shows an error when the upload throws, instead of staying stuck', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    mocks.uploadNewsImage.mockRejectedValue(new Error('network error'))
    render(<NewsArticleForm {...editArgs} onSave={onSave} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['imagen'], 'nueva.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(
      await screen.findByText('No se pudo subir la imagen. Inténtelo de nuevo.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar' })).not.toBeDisabled()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('starts blank for a new article and displays validation errors when attempting to save with missing fields', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<NewsArticleForm {...addArgs} onSave={onSave} />)

    expect(screen.getByRole('textbox', { name: 'Título' })).toHaveValue('')

    await user.type(screen.getByRole('textbox', { name: 'Título' }), 'Un título')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    // Shows validation error messages for missing required fields
    expect(screen.getByText('Debe indicar al menos un autor.')).toBeInTheDocument()
    expect(screen.getByText('La fuente es obligatoria.')).toBeInTheDocument()
    expect(screen.getByText('El resumen es obligatorio.')).toBeInTheDocument()
    expect(
      screen.queryByText('Debe seleccionar una imagen para la noticia.'),
    ).not.toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('successfully saves a new article without providing an image', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<NewsArticleForm {...addArgs} onSave={onSave} />)

    await user.type(screen.getByRole('textbox', { name: 'Título' }), 'Noticia sin imagen')
    await user.type(screen.getByRole('textbox', { name: 'Autores' }), 'Autor Uno')
    await user.type(screen.getByRole('textbox', { name: 'Fuente' }), 'UCR')
    await user.type(screen.getByRole('textbox', { name: 'Enlace' }), 'https://ucr.ac.cr/noticia')
    await user.type(screen.getByRole('textbox', { name: 'Resumen' }), 'Resumen de prueba')

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Noticia sin imagen',
        imageUrl: '',
      }),
    )
  })

  test('prompts discard confirmation when clicking Cancel with modifications, and cancels upon confirmation', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<NewsArticleForm {...addArgs} onCancel={onCancel} />)

    await user.type(screen.getByRole('textbox', { name: 'Título' }), 'Borrador')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    // Discard confirm dialog appears
    expect(
      screen.getByRole('dialog', { name: 'Descartar cambios no guardados' }),
    ).toBeInTheDocument()
    expect(onCancel).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test('does not cancel when discard confirmation is dismissed', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<NewsArticleForm {...addArgs} onCancel={onCancel} />)

    await user.type(screen.getByRole('textbox', { name: 'Título' }), 'Borrador')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    await user.click(screen.getByRole('button', { name: 'Seguir editando' }))
    expect(onCancel).not.toHaveBeenCalled()
    expect(
      screen.queryByRole('dialog', { name: 'Descartar cambios no guardados' }),
    ).not.toBeInTheDocument()
  })
})
