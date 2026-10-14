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
import { AddNew, EditExisting, EditWithoutPhoto } from './ResearcherForm.stories'

const editArgs = EditExisting.args as ResearcherFormProps
const editWithoutPhotoArgs = EditWithoutPhoto.args as ResearcherFormProps
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
    expect(screen.getByText(researcher.email as string)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: `Eliminar ${researcher.email}` })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Institución' })).toHaveValue(researcher.institution)
    expect(screen.getByRole('textbox', { name: 'Descripción' })).toHaveValue(researcher.description)
  })

  test('starts blank for a new researcher', () => {
    render(<ResearcherForm {...addArgs} />)

    expect(screen.getByRole('textbox', { name: 'Rol' })).toHaveValue('')
    expect(screen.getByRole('textbox', { name: 'Nombre' })).toHaveValue('')
    expect(screen.queryByRole('button', { name: /^Eliminar / })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Añadir contacto' })).toBeInTheDocument()
    // "Confirmar" stays clickable even blank — missing fields are only reported once pressed.
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeEnabled()
  })

  test('calls onCancel directly, without asking for confirmation', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<ResearcherForm {...editArgs} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('lists every missing field when confirming a blank form, without asking for confirmation', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<ResearcherForm {...addArgs} onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.queryByText('La foto es obligatoria.')).not.toBeInTheDocument()
    expect(screen.getByText('El rol es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('El nombre es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('La institución es obligatoria.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('names only the field that was cleared', async () => {
    const user = userEvent.setup()
    render(<ResearcherForm {...editArgs} />)

    await user.clear(screen.getByRole('textbox', { name: 'Nombre' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.getByText('El nombre es obligatorio.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('clears the field error once the field is filled back in', async () => {
    const user = userEvent.setup()
    render(<ResearcherForm {...editArgs} />)

    await user.clear(screen.getByRole('textbox', { name: 'Nombre' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(screen.getByText('El nombre es obligatorio.')).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: /Nombre/ }), 'Alguien')

    expect(screen.queryByText('El nombre es obligatorio.')).not.toBeInTheDocument()
  })

  test('does not require contacto — it is optional', async () => {
    const user = userEvent.setup()
    render(<ResearcherForm {...editArgs} />)
    const researcher = editArgs.researcher!

    await user.click(screen.getByRole('button', { name: `Eliminar ${researcher.email}` }))

    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeEnabled()
  })

  test('adds a contact through the modal and shows it as a chip', async () => {
    const user = userEvent.setup()
    render(<ResearcherForm {...editArgs} />)

    await user.click(screen.getByRole('button', { name: 'Añadir contacto' }))
    const dialog = screen.getByRole('dialog', { name: 'Añadir contacto' })
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Correo electrónico' }),
      'nuevo@ucr.ac.cr',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Añadir' }))

    expect(screen.getByText('nuevo@ucr.ac.cr')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Añadir contacto' })).not.toBeInTheDocument()
  })

  test('hides the add-contact button once 2 addresses are present', async () => {
    const user = userEvent.setup()
    render(<ResearcherForm {...editArgs} />)

    await user.click(screen.getByRole('button', { name: 'Añadir contacto' }))
    const dialog = screen.getByRole('dialog', { name: 'Añadir contacto' })
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Correo electrónico' }),
      'nuevo@ucr.ac.cr',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Añadir' }))

    expect(screen.queryByRole('button', { name: 'Añadir contacto' })).not.toBeInTheDocument()
  })

  test('rejects a malformed address in the add-contact modal', async () => {
    const user = userEvent.setup()
    render(<ResearcherForm {...editArgs} />)

    await user.click(screen.getByRole('button', { name: 'Añadir contacto' }))
    const dialog = screen.getByRole('dialog', { name: 'Añadir contacto' })
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Correo electrónico' }),
      'not-an-email',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Añadir' }))

    expect(within(dialog).getByText('El correo no es válido.')).toBeInTheDocument()
    expect(screen.queryByText('not-an-email')).not.toBeInTheDocument()
  })

  test('rejects an address that was already added', async () => {
    const user = userEvent.setup()
    render(<ResearcherForm {...editArgs} />)
    const researcher = editArgs.researcher!

    await user.click(screen.getByRole('button', { name: 'Añadir contacto' }))
    const dialog = screen.getByRole('dialog', { name: 'Añadir contacto' })
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Correo electrónico' }),
      researcher.email as string,
    )
    await user.click(within(dialog).getByRole('button', { name: 'Añadir' }))

    expect(within(dialog).getByText('Ese correo ya fue agregado.')).toBeInTheDocument()
  })

  test('removes a contact chip', async () => {
    const user = userEvent.setup()
    render(<ResearcherForm {...editArgs} />)
    const researcher = editArgs.researcher!

    await user.click(screen.getByRole('button', { name: `Eliminar ${researcher.email}` }))

    expect(screen.queryByText(researcher.email as string)).not.toBeInTheDocument()
  })

  test('saves several contacts as a comma-separated list', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<ResearcherForm {...editArgs} onSave={onSave} />)
    const researcher = editArgs.researcher!

    await user.click(screen.getByRole('button', { name: 'Añadir contacto' }))
    const addDialog = screen.getByRole('dialog', { name: 'Añadir contacto' })
    await user.type(
      within(addDialog).getByRole('textbox', { name: 'Correo electrónico' }),
      'nuevo@ucr.ac.cr',
    )
    await user.click(within(addDialog).getByRole('button', { name: 'Añadir' }))

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    const confirmDialog = screen.getByRole('dialog', { name: 'Guardar cambios' })
    await user.click(within(confirmDialog).getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ email: `${researcher.email}, nuevo@ucr.ac.cr` }),
    )
  })

  test('creates a researcher without a photo and shows no photo error', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<ResearcherForm {...addArgs} onSave={onSave} />)

    await user.type(screen.getByRole('textbox', { name: 'Rol' }), 'Investigador')
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Persona Nueva')
    await user.type(screen.getByRole('textbox', { name: 'Institución' }), 'UCR')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.queryByText('La foto es obligatoria.')).not.toBeInTheDocument()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar' }))

    expect(mocks.uploadResearcherImage).not.toHaveBeenCalled()
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'Persona Nueva', src: '' }))
  })

  test('saves an edit of a researcher who has no photo without asking for one', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<ResearcherForm {...editWithoutPhotoArgs} onSave={onSave} />)

    await user.clear(screen.getByRole('textbox', { name: 'Rol' }))
    await user.type(screen.getByRole('textbox', { name: 'Rol' }), 'Investigador asociado')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar' }))

    expect(mocks.uploadResearcherImage).not.toHaveBeenCalled()
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'Investigador asociado', src: '' }),
    )
  })

  test('saves without a photo once the existing one is removed', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<ResearcherForm {...editArgs} onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Quitar imagen' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.queryByText('La foto es obligatoria.')).not.toBeInTheDocument()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar' }))

    expect(mocks.uploadResearcherImage).not.toHaveBeenCalled()
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ src: '' }))
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

  test('asks before discarding unsaved changes and closes once confirmed', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<ResearcherForm {...editArgs} onCancel={onCancel} />)

    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), ' editado')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    const dialog = screen.getByRole('dialog', { name: 'Descartar cambios no guardados' })
    expect(onCancel).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: 'Descartar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test('keeps the form open when discard is dismissed', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<ResearcherForm {...editArgs} onCancel={onCancel} />)

    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), ' editado')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await user.click(screen.getByRole('button', { name: 'Seguir editando' }))

    expect(onCancel).not.toHaveBeenCalled()
    expect(
      screen.queryByRole('dialog', { name: 'Descartar cambios no guardados' }),
    ).not.toBeInTheDocument()
  })
})
