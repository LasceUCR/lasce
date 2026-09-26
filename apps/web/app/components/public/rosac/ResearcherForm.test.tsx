import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  uploadResearcherImage: vi.fn(),
}))

vi.mock('@/app/(public)/radioastronomia/actions', () => ({
  uploadResearcherImage: mocks.uploadResearcherImage,
}))

import { ResearcherForm, type ResearcherFormProps } from './ResearcherForm'
import { AddNew, EditExisting } from './ResearcherForm.stories'

const editArgs = EditExisting.args as ResearcherFormProps
const addArgs = AddNew.args as ResearcherFormProps

// jsdom has no `URL.createObjectURL`; `FileDropInput` calls it for its own local preview.
URL.createObjectURL = vi.fn(() => 'blob:mock-url')
URL.revokeObjectURL = vi.fn()

describe('ResearcherForm', () => {
  test('starts pre-filled with the researcher being edited', () => {
    render(<ResearcherForm {...editArgs} />)

    const researcher = editArgs.researcher!
    expect(screen.getByRole('textbox', { name: 'Rol' })).toHaveValue(researcher.role)
    expect(screen.getByRole('textbox', { name: 'Nombre' })).toHaveValue(researcher.name)
    expect(screen.getByRole('textbox', { name: 'Contacto' })).toHaveValue(researcher.email)
    expect(screen.getByRole('textbox', { name: 'Institución' })).toHaveValue(researcher.institution)
    expect(screen.getByRole('textbox', { name: 'Descripción' })).toHaveValue(researcher.description)
  })

  test('starts blank for a new researcher', () => {
    render(<ResearcherForm {...addArgs} />)

    expect(screen.getByRole('textbox', { name: 'Rol' })).toHaveValue('')
    expect(screen.getByRole('textbox', { name: 'Nombre' })).toHaveValue('')
    expect(screen.getByRole('textbox', { name: 'Contacto' })).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled()
  })

  test('calls onCancel directly, without asking for confirmation', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<ResearcherForm {...editArgs} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('disables saving when a required field is cleared', async () => {
    const user = userEvent.setup()
    render(<ResearcherForm {...editArgs} />)

    await user.clear(screen.getByRole('textbox', { name: 'Nombre' }))

    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled()
  })

  test('does not require contacto — it is optional', async () => {
    const user = userEvent.setup()
    render(<ResearcherForm {...editArgs} />)

    await user.clear(screen.getByRole('textbox', { name: 'Contacto' }))

    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeEnabled()
  })

  test('disables saving once the existing photo is removed', async () => {
    const user = userEvent.setup()
    render(<ResearcherForm {...editArgs} />)

    await user.click(screen.getByRole('button', { name: 'Quitar imagen' }))

    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled()
  })

  test('asks for confirmation before saving', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<ResearcherForm {...editArgs} onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Guardar cambios' })).toBeInTheDocument()
  })

  test('saves the edited values once the confirmation is accepted, keeping the existing photo', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<ResearcherForm {...editArgs} onSave={onSave} />)

    await user.clear(screen.getByRole('textbox', { name: 'Rol' }))
    await user.type(screen.getByRole('textbox', { name: 'Rol' }), 'Investigador asociado')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    const dialog = screen.getByRole('dialog', { name: 'Guardar cambios' })
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

    expect(mocks.uploadResearcherImage).not.toHaveBeenCalled()
    expect(onSave).toHaveBeenCalledWith({
      role: 'Investigador asociado',
      name: editArgs.researcher!.name,
      email: editArgs.researcher!.email,
      institution: editArgs.researcher!.institution,
      description: editArgs.researcher!.description,
      src: editArgs.researcher!.src,
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('does not save when the confirmation is cancelled', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<ResearcherForm {...editArgs} onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    const dialog = screen.getByRole('dialog', { name: 'Guardar cambios' })
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('uploads a freshly dropped photo and saves with the returned public URL', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    mocks.uploadResearcherImage.mockResolvedValue({
      ok: true,
      imageUrl: 'https://s3.example/lasce/123_nueva.png',
    })
    render(<ResearcherForm {...editArgs} onSave={onSave} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['imagen'], 'nueva.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    const dialog = screen.getByRole('dialog', { name: 'Guardar cambios' })
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

    expect(mocks.uploadResearcherImage).toHaveBeenCalledTimes(1)
    const formData = mocks.uploadResearcherImage.mock.calls[0]![0] as FormData
    expect((formData.get('file') as File).name).toBe('nueva.png')
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ src: 'https://s3.example/lasce/123_nueva.png' }),
    )
  })

  test('shows the error and does not save when the upload fails', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    mocks.uploadResearcherImage.mockResolvedValue({
      ok: false,
      error: 'La imagen es demasiado grande.',
    })
    render(<ResearcherForm {...editArgs} onSave={onSave} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['imagen'], 'nueva.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    const dialog = screen.getByRole('dialog', { name: 'Guardar cambios' })
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('La imagen es demasiado grande.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('recovers the button and shows an error when the upload throws', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    mocks.uploadResearcherImage.mockRejectedValue(new Error('network error'))
    render(<ResearcherForm {...editArgs} onSave={onSave} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['imagen'], 'nueva.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    const dialog = screen.getByRole('dialog', { name: 'Guardar cambios' })
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

    expect(
      await screen.findByText('No se pudo subir la imagen. Inténtelo de nuevo.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar' })).not.toBeDisabled()
    expect(onSave).not.toHaveBeenCalled()
  })
})
