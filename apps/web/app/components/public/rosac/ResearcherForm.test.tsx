import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  uploadResearcherImage: vi.fn(),
}))

vi.mock('@/app/(public)/radioastronomia/actions', () => ({
  uploadResearcherImage: mocks.uploadResearcherImage,
}))

import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import { renderWithIntl, type RenderWithIntlOptions } from '@/app/lib/i18n/testing'

import {
  ResearcherForm,
  type BilingualResearcherFormProps,
  type ResearcherFormProps,
} from './ResearcherForm'
import {
  AddNew,
  Bilingual,
  BilingualCreate,
  BilingualLegacy,
  EditExisting,
  EditWithoutPhoto,
} from './ResearcherForm.stories'

const editArgs = EditExisting.args as ResearcherFormProps
const editWithoutPhotoArgs = EditWithoutPhoto.args as ResearcherFormProps
const addArgs = AddNew.args as ResearcherFormProps
const bilingualArgs = Bilingual.args as BilingualResearcherFormProps
const bilingualCreateArgs = BilingualCreate.args as BilingualResearcherFormProps
const bilingualLegacyArgs = BilingualLegacy.args as BilingualResearcherFormProps

/** The form reports a failed upload with a toast, so it renders inside the app's providers. */
function render(ui: ReactElement, options?: RenderWithIntlOptions) {
  return renderWithIntl(<ToastProvider>{ui}</ToastProvider>, options)
}

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
    expect(screen.getByRole('button', { name: 'Agregar' })).toBeEnabled()
    expect(screen.getByRole('textbox', { name: 'Correo electrónico' })).toHaveValue('')
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

  test('adds a contact from the field and shows it as a chip', async () => {
    const user = userEvent.setup()
    render(<ResearcherForm {...editArgs} />)

    const emailInput = screen.getByRole('textbox', { name: 'Correo electrónico' })
    await user.type(emailInput, 'nuevo@ucr.ac.cr')
    await user.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(screen.getByText('nuevo@ucr.ac.cr')).toBeInTheDocument()
    expect(emailInput).toHaveValue('')
  })

  test('stops at two addresses', async () => {
    const user = userEvent.setup()
    render(<ResearcherForm {...editArgs} />)

    const emailInput = screen.getByRole('textbox', { name: 'Correo electrónico' })
    await user.type(emailInput, 'nuevo@ucr.ac.cr')
    await user.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(emailInput).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Agregar' })).toBeDisabled()
  })

  test('rejects a malformed address in the contact field', async () => {
    const user = userEvent.setup()
    render(<ResearcherForm {...editArgs} />)

    const emailInput = screen.getByRole('textbox', { name: 'Correo electrónico' })
    await user.type(emailInput, 'not-an-email')
    await user.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(screen.getByText('El correo no es válido.')).toBeInTheDocument()
    expect(emailInput).toHaveAttribute('aria-invalid', 'true')
    expect(emailInput).toHaveAccessibleDescription('El correo no es válido.')
    expect(emailInput).toHaveValue('not-an-email')
    expect(screen.queryByRole('listitem', { name: /not-an-email/ })).not.toBeInTheDocument()
  })

  test('rejects an address that was already added', async () => {
    const user = userEvent.setup()
    render(<ResearcherForm {...editArgs} />)
    const researcher = editArgs.researcher!

    const emailInput = screen.getByRole('textbox', { name: 'Correo electrónico' })
    await user.type(emailInput, researcher.email as string)
    await user.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(screen.getByText('Ese correo ya fue agregado.')).toBeInTheDocument()
    expect(emailInput).toHaveAttribute('aria-invalid', 'true')
    expect(emailInput).toHaveAccessibleDescription('Ese correo ya fue agregado.')
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

    const emailInput = screen.getByRole('textbox', { name: 'Correo electrónico' })
    await user.type(emailInput, 'nuevo@ucr.ac.cr')
    await user.click(screen.getByRole('button', { name: 'Agregar' }))

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

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

    expect(mocks.uploadResearcherImage).not.toHaveBeenCalled()
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ src: '' }))
  })

  test('saves the edited values, keeping the existing photo', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<ResearcherForm {...editArgs} onSave={onSave} />)

    await user.clear(screen.getByRole('textbox', { name: 'Rol' }))
    await user.type(screen.getByRole('textbox', { name: 'Rol' }), 'Investigador asociado')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

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

  test('saves a new researcher straight away, without a confirmation dialog', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<ResearcherForm {...addArgs} onSave={onSave} />)

    await user.type(screen.getByRole('textbox', { name: 'Rol' }), 'Investigador')
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Persona Nueva')
    await user.type(screen.getByRole('textbox', { name: 'Institución' }), 'UCR')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  test('saves an edit straight away, without a confirmation dialog', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<ResearcherForm {...editArgs} onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onSave).toHaveBeenCalledTimes(1)
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

    expect(await screen.findByText('La imagen es demasiado grande.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
    // A toast, not a custom message inside the form, and the input stays for a retry.
    expect(document.querySelector('.cms-form .form-alert')).toBeNull()
    expect(screen.getByRole('textbox', { name: 'Rol' })).toHaveValue(editArgs.researcher!.role)
  })

  test('replaces the previous upload error instead of stacking it when retrying', async () => {
    const user = userEvent.setup()
    mocks.uploadResearcherImage.mockResolvedValue({
      ok: false,
      error: 'La imagen es demasiado grande.',
    })
    render(<ResearcherForm {...editArgs} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['imagen'], 'nueva.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    await screen.findByText('La imagen es demasiado grande.')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findAllByText('La imagen es demasiado grande.')).toHaveLength(1)
  })

  test('recovers the button and shows an error when the upload throws', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    mocks.uploadResearcherImage.mockRejectedValue(new Error('network error'))
    render(<ResearcherForm {...editArgs} onSave={onSave} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['imagen'], 'nueva.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

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

describe('ResearcherForm: bilingual mode', () => {
  type User = ReturnType<typeof userEvent.setup>

  function tab(name: RegExp) {
    return screen.getByRole('tab', { name })
  }

  /** A field's accessible name also carries its error message, so match on the label's start. */
  function field(label: string) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return screen.getByRole('textbox', { name: new RegExp(`^${escaped}`) })
  }

  async function replace(user: User, label: string, value: string) {
    const input = field(label)
    await user.clear(input)
    if (value) await user.type(input, value)
  }

  async function confirmSave(user: User) {
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
  }

  test('opens on the Spanish tab with the stored Spanish role and description', () => {
    render(<ResearcherForm {...bilingualArgs} />)

    const content = bilingualArgs.translation.editing?.content
    expect(tab(/^Español/)).toHaveAttribute('aria-selected', 'true')
    expect(field('Rol (Español)')).toHaveValue(content?.es.role)
    expect(field('Descripción (Español)')).toHaveValue(content?.es.description)
    expect(screen.queryByRole('textbox', { name: /^Rol \(English\)/ })).not.toBeInTheDocument()
  })

  test('replaces the single role and description with the language tabs', () => {
    render(<ResearcherForm {...bilingualArgs} />)

    expect(screen.queryByRole('textbox', { name: 'Rol' })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Descripción' })).not.toBeInTheDocument()
  })

  test('shows the English text on the English tab', async () => {
    const user = userEvent.setup()
    render(<ResearcherForm {...bilingualArgs} />)

    await user.click(tab(/^English/))

    expect(field('Rol (English)')).toHaveValue('Principal investigator')
    expect(field('Rol (English)')).toHaveAttribute('lang', 'en')
  })

  test('keeps the shared fields outside the tabs', () => {
    render(<ResearcherForm {...bilingualArgs} />)

    const panel = screen.getByRole('tabpanel')
    expect(within(panel).queryByRole('textbox', { name: 'Nombre' })).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Nombre' })).toHaveValue(
      bilingualArgs.researcher?.name,
    )
    expect(screen.getByRole('textbox', { name: 'Institución' })).toBeInTheDocument()
  })

  test('saves only the shared fields, with no content, when no text changed', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<ResearcherForm {...bilingualArgs} onSave={onSave} />)

    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), ' editado')
    await confirmSave(user)

    const researcher = bilingualArgs.researcher!
    expect(onSave).toHaveBeenCalledWith({
      name: `${researcher.name} editado`,
      email: researcher.email,
      institution: researcher.institution,
      src: researcher.src,
      content: null,
      confirmedUnchanged: [],
    })
  })

  test('saves both languages in full once the role changed in both', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<ResearcherForm {...bilingualArgs} onSave={onSave} />)

    await replace(user, 'Rol (Español)', 'Investigadora asociada')
    await user.click(tab(/^English/))
    await replace(user, 'Rol (English)', 'Associate researcher')
    await confirmSave(user)

    const content = bilingualArgs.translation.editing?.content
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        content: {
          es: { role: 'Investigadora asociada', description: content?.es.description },
          en: { role: 'Associate researcher', description: content?.en?.description },
        },
        confirmedUnchanged: [],
      }),
    )
  })

  test('asks to review the other language when only one language changed', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<ResearcherForm {...bilingualArgs} onSave={onSave} />)

    await replace(user, 'Rol (Español)', 'Investigadora asociada')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.queryByRole('dialog', { name: 'Guardar cambios' })).not.toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
    expect(tab(/^English/)).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('switch')).not.toBeChecked()
  })

  test('sends the review as confirmed unchanged once the editor accepts it', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<ResearcherForm {...bilingualArgs} onSave={onSave} />)

    await replace(user, 'Rol (Español)', 'Investigadora asociada')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    await user.click(screen.getByRole('switch'))
    await confirmSave(user)

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ confirmedUnchanged: [{ locale: 'en', field: 'role' }] }),
    )
  })

  test('requires the English role when creating, opening the English tab', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<ResearcherForm {...bilingualCreateArgs} onSave={onSave} />)

    await user.type(field('Rol (Español)'), 'Investigador')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(tab(/^English/)).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('El rol en inglés es obligatorio.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('requires the description in both languages once it is filled in one', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<ResearcherForm {...bilingualArgs} onSave={onSave} />)

    await replace(user, 'Descripción (Español)', 'Texto nuevo')
    await user.click(tab(/^English/))
    await replace(user, 'Descripción (English)', '')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.queryByRole('dialog', { name: 'Guardar cambios' })).not.toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('opens a legacy researcher with its base text flagged as possibly not Spanish', async () => {
    const user = userEvent.setup()
    render(<ResearcherForm {...bilingualLegacyArgs} />)

    expect(screen.getByText(/podría no estar en español/)).toBeInTheDocument()
    expect(field('Rol (Español)')).toHaveAttribute('lang', '')

    await user.click(tab(/^English/))
    expect(screen.getByText(/aún no tiene versión en inglés/)).toBeInTheDocument()
    expect(field('Rol (English)')).toHaveValue('')
  })

  test('saves the shared fields of a legacy researcher without translating it', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<ResearcherForm {...bilingualLegacyArgs} onSave={onSave} />)

    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), ' editado')
    await confirmSave(user)

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ content: null, confirmedUnchanged: [] }),
    )
  })

  test('asks before discarding a changed role', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<ResearcherForm {...bilingualArgs} onCancel={onCancel} />)

    await user.type(field('Rol (Español)'), ' editado')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    const dialog = screen.getByRole('dialog', { name: 'Descartar cambios no guardados' })
    expect(onCancel).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Descartar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test('closes without asking when nothing changed', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<ResearcherForm {...bilingualArgs} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('renders photo file drop area fully in English under en locale', () => {
    render(<ResearcherForm {...editArgs} />, { locale: 'en' })

    expect(screen.getByText('Photo')).toBeInTheDocument()
    expect(
      screen.getByText('Optional. Researcher portrait, in JPG or PNG format.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Drag an image here or click to select from your device'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove image' })).toBeInTheDocument()
  })
})
