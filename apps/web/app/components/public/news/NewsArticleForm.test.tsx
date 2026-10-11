import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  uploadNewsImage: vi.fn(),
}))

vi.mock('@/app/(public)/noticias/actions', () => ({
  uploadNewsImage: mocks.uploadNewsImage,
}))

import type { ReactElement } from 'react'

import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import { renderWithIntl } from '@/app/lib/i18n/testing'

import { NewsArticleForm, type NewsArticleFormProps } from './NewsArticleForm'
import { AddNew, EditExisting } from './NewsArticleForm.stories'

const editArgs = EditExisting.args as NewsArticleFormProps
const addArgs = AddNew.args as NewsArticleFormProps

// jsdom has no `URL.createObjectURL`; `FileDropInput` calls it for its own local preview.
URL.createObjectURL = vi.fn(() => 'blob:mock-url')
URL.revokeObjectURL = vi.fn()

/** Upload failures are reported as toasts, so the form needs a provider around it. */
function renderForm(ui: ReactElement) {
  return renderWithIntl(<ToastProvider>{ui}</ToastProvider>)
}

describe('NewsArticleForm', () => {
  test('pre-fills every field from the article it is given', () => {
    renderForm(<NewsArticleForm {...editArgs} />)

    const article = editArgs.article!
    expect(screen.getByRole('textbox', { name: 'Título' })).toHaveValue(article.title)
    expect(screen.getByRole('textbox', { name: 'Autores' })).toHaveValue(article.authors)
    expect(screen.getByRole('img')).toHaveAttribute('src', article.imageUrl)
  })

  test('saves the edited fields, keeping the original image', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderForm(<NewsArticleForm {...editArgs} onSave={onSave} />)

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
    renderForm(<NewsArticleForm {...editArgs} onSave={onSave} />)

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
    renderForm(<NewsArticleForm {...editArgs} onCancel={onCancel} onSave={onSave} />)

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
    renderForm(<NewsArticleForm {...editArgs} onSave={onSave} />)

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
    renderForm(<NewsArticleForm {...editArgs} onSave={onSave} />)

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
    renderForm(<NewsArticleForm {...editArgs} onSave={onSave} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['imagen'], 'nueva.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(
      await screen.findByText('No se pudo subir la imagen. Inténtelo de nuevo.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar' })).not.toBeDisabled()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('explains a storage outage reported by the upload', async () => {
    const user = userEvent.setup()
    const reason =
      'No se pudo subir la imagen: el servicio de archivos no respondió. Inténtelo de nuevo en unos minutos.'
    mocks.uploadNewsImage.mockResolvedValue({ ok: false, error: reason })
    renderForm(<NewsArticleForm {...editArgs} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['imagen'], 'nueva.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText(reason)).toBeInTheDocument()
  })

  test('replaces the previous upload error when the admin tries again', async () => {
    const user = userEvent.setup()
    mocks.uploadNewsImage
      .mockResolvedValueOnce({ ok: false, error: 'La imagen es demasiado grande.' })
      .mockResolvedValueOnce({ ok: false, error: 'El tipo de archivo no es válido.' })
    renderForm(<NewsArticleForm {...editArgs} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['imagen'], 'nueva.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    await screen.findByText('La imagen es demasiado grande.')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('El tipo de archivo no es válido.')).toBeInTheDocument()
    expect(screen.queryByText('La imagen es demasiado grande.')).not.toBeInTheDocument()
  })

  test('starts blank for a new article and disables save until the required fields and an image are present', async () => {
    const user = userEvent.setup()
    renderForm(<NewsArticleForm {...addArgs} />)

    expect(screen.getByRole('textbox', { name: 'Título' })).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled()

    await user.type(screen.getByRole('textbox', { name: 'Título' }), 'Un título')

    // Still disabled: a title alone isn't enough without the other required fields and an image.
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled()
  })
})
