import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  uploadAcademicActivityImage: vi.fn(),
}))

vi.mock('@/app/(public)/actividades-academicas/actions', () => ({
  uploadAcademicActivityImage: mocks.uploadAcademicActivityImage,
}))

import { buildCreateRequest, buildUpdateRequest } from '@/app/lib/academic-activities-form'
import { renderWithIntl } from '@/app/lib/i18n/testing'

import {
  AcademicActivityForm,
  type AcademicActivityFormHandle,
  type AcademicActivityFormProps,
} from './AcademicActivityForm'
import {
  AddNew,
  EditExisting,
  EnglishInterface,
  Legacy,
  Saving,
  editableActivity,
} from './AcademicActivityForm.stories'

const editArgs = EditExisting.args as AcademicActivityFormProps
const addArgs = AddNew.args as AcademicActivityFormProps
const legacyArgs = Legacy.args as AcademicActivityFormProps

type User = ReturnType<typeof userEvent.setup>

function tab(name: RegExp) {
  return screen.getByRole('tab', { name })
}

/** A field's accessible name also carries its error message, so match on the label's start. */
function field(label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return screen.getByRole('textbox', { name: new RegExp(`^${escaped}`) })
}

async function replace(user: User, name: string, value: string) {
  const input = field(name)
  await user.clear(input)
  if (value) await user.type(input, value)
}

async function save(user: User) {
  await user.click(screen.getByRole('button', { name: 'Confirmar' }))
}

URL.createObjectURL = vi.fn(() => 'blob:mock-url')
URL.revokeObjectURL = vi.fn()

describe('AcademicActivityForm: tabs and pre-filled values', () => {
  test('opens on the Spanish tab with the stored Spanish text and the shared fields', () => {
    renderWithIntl(<AcademicActivityForm {...editArgs} />)

    expect(tab(/^Español/)).toHaveAttribute('aria-selected', 'true')
    expect(field('Título (Español)')).toHaveValue(editableActivity.editing!.content.es.title)
    expect(field('Categoría (Español)')).toHaveValue(editableActivity.editing!.content.es.category)
    expect(field('Descripción (Español)')).toHaveValue(
      editableActivity.editing!.content.es.description,
    )
    expect(screen.getByLabelText(/^Fecha de inicio/)).toHaveValue(editableActivity.startDate)
    expect(screen.getByLabelText('Fecha de finalización')).toHaveValue(editableActivity.endDate)
    expect(screen.getByRole('textbox', { name: 'Ubicación' })).toHaveValue(
      editableActivity.location,
    )
    expect(screen.getByRole('img')).toHaveAttribute('src', editableActivity.photoUrl)
  })

  test('shows the English translation on the English tab', async () => {
    const user = userEvent.setup()
    renderWithIntl(<AcademicActivityForm {...editArgs} />)

    await user.click(tab(/^English/))

    expect(field('Título (English)')).toHaveValue(editableActivity.editing!.content.en!.title)
    expect(field('Título (English)')).toHaveAttribute('lang', 'en')
  })

  test('keeps the dates and location outside the tabs', () => {
    renderWithIntl(<AcademicActivityForm {...editArgs} />)

    const panel = screen.getByRole('tabpanel')
    expect(within(panel).queryByLabelText('Fecha de inicio')).not.toBeInTheDocument()
    expect(screen.getByLabelText(/^Fecha de inicio/)).toBeInTheDocument()
  })

  test('follows the site language for its own labels', () => {
    renderWithIntl(
      <AcademicActivityForm {...(EnglishInterface.args as AcademicActivityFormProps)} />,
      {
        locale: 'en',
      },
    )

    expect(field('Title (Español)')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Location' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
  })

  test('disables its fields and says it is saving while a save is in flight', () => {
    renderWithIntl(<AcademicActivityForm {...(Saving.args as AcademicActivityFormProps)} />)

    expect(field('Título (Español)')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Guardando...' })).toBeDisabled()
  })
})

describe('AcademicActivityForm: saving', () => {
  test('saves a shared-field change as is, without asking about translations', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<AcademicActivityForm {...editArgs} onSave={onSave} />)

    await replace(user, 'Ubicación', 'Heredia, Costa Rica')
    await save(user)

    expect(onSave).toHaveBeenCalledTimes(1)
    const [draft, confirmed, newPhotoUrl] = onSave.mock.calls[0]!
    expect(buildUpdateRequest(editArgs.initial, draft, confirmed, newPhotoUrl)).toEqual({
      version: editArgs.initial.version,
      location: 'Heredia, Costa Rica',
    })
  })

  test('sends both dates together when either changes', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<AcademicActivityForm {...editArgs} onSave={onSave} />)

    const endDateInput = screen.getByLabelText('Fecha de finalización')
    await user.clear(endDateInput)
    await user.type(endDateInput, '2026-02-22')
    await save(user)

    const [draft, confirmed, newPhotoUrl] = onSave.mock.calls[0]!
    expect(buildUpdateRequest(editArgs.initial, draft, confirmed, newPhotoUrl)).toEqual({
      version: editArgs.initial.version,
      startDate: editArgs.initial.draft.startDate,
      endDate: '2026-02-22',
    })
  })

  test('rejects an end date earlier than the start date and does not save', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<AcademicActivityForm {...editArgs} onSave={onSave} />)

    const endDateInput = screen.getByLabelText('Fecha de finalización')
    await user.clear(endDateInput)
    await user.type(endDateInput, '2026-01-01')
    await save(user)

    expect(onSave).not.toHaveBeenCalled()
    expect(
      screen.getByText('La fecha de finalización debe ser igual o posterior a la fecha de inicio.'),
    ).toBeInTheDocument()
  })

  test('asks to update or confirm the other language when a title changes in one only', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<AcademicActivityForm {...editArgs} onSave={onSave} />)

    await replace(user, 'Título (Español)', 'Un título nuevo')
    await save(user)

    expect(onSave).not.toHaveBeenCalled()
    expect(tab(/^English/)).toHaveAttribute('aria-selected', 'true')

    await user.click(
      screen.getByRole('switch', { name: 'El título en inglés sigue siendo correcto' }),
    )
    await save(user)

    expect(onSave).toHaveBeenCalledTimes(1)
    const [draft, confirmed, newPhotoUrl] = onSave.mock.calls[0]!
    expect(buildUpdateRequest(editArgs.initial, draft, confirmed, newPhotoUrl)).toMatchObject({
      content: {
        es: { title: 'Un título nuevo' },
        en: { title: editableActivity.editing!.content.en!.title },
      },
      confirmedUnchanged: [{ locale: 'en', field: 'title' }],
    })
  })

  test('saves a new activity once both languages, the shared fields and the photo are filled', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    mocks.uploadAcademicActivityImage.mockResolvedValue({
      ok: true,
      imageUrl: 'https://s3.example/lasce/nueva.png',
    })
    renderWithIntl(<AcademicActivityForm {...addArgs} onSave={onSave} />)

    await user.type(field('Título (Español)'), 'Un taller')
    await user.type(field('Categoría (Español)'), 'Taller')
    await user.type(field('Descripción (Español)'), 'Una descripción.')
    await user.type(field('Texto alternativo de la imagen (Español)'), 'Alternativo.')
    await user.click(tab(/^English/))
    await user.type(field('Título (English)'), 'A workshop')
    await user.type(field('Categoría (English)'), 'Workshop')
    await user.type(field('Descripción (English)'), 'A description.')
    await user.type(field('Texto alternativo de la imagen (English)'), 'Alt text.')
    await user.type(screen.getByLabelText(/^Fecha de inicio/), '2026-04-01')
    await user.type(screen.getByRole('textbox', { name: 'Ubicación' }), 'San José, Costa Rica')

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['imagen'], 'nueva.png', { type: 'image/png' }))
    await save(user)

    expect(onSave).toHaveBeenCalledTimes(1)
    const [draft, , newPhotoUrl] = onSave.mock.calls[0]!
    expect(buildCreateRequest(draft, newPhotoUrl ?? '')).toEqual({
      content: {
        es: {
          title: 'Un taller',
          category: 'Taller',
          description: 'Una descripción.',
          photoAlt: 'Alternativo.',
        },
        en: {
          title: 'A workshop',
          category: 'Workshop',
          description: 'A description.',
          photoAlt: 'Alt text.',
        },
      },
      startDate: '2026-04-01',
      endDate: null,
      location: 'San José, Costa Rica',
      photoUrl: 'https://s3.example/lasce/nueva.png',
    })
  })

  test('explains what is missing instead of saving a new activity', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<AcademicActivityForm {...addArgs} onSave={onSave} />)

    await user.type(field('Título (Español)'), 'Un título')
    await save(user)

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText('La fecha de inicio es obligatoria.')).toBeInTheDocument()
    expect(screen.getByText('La ubicación es obligatoria.')).toBeInTheDocument()
    expect(screen.getByText('La imagen es obligatoria.')).toBeInTheDocument()
    expect(tab(/^English/)).toHaveAccessibleName(/por revisar/)
  })

  test('shows the upload error and does not save when the upload is rejected', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    mocks.uploadAcademicActivityImage.mockResolvedValue({
      ok: false,
      error: 'La imagen es demasiado grande.',
    })
    renderWithIntl(<AcademicActivityForm {...editArgs} onSave={onSave} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['imagen'], 'nueva.png', { type: 'image/png' }))
    await save(user)

    expect(await screen.findByText('La imagen es demasiado grande.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })
})

describe('AcademicActivityForm: legacy activities', () => {
  test('flags the base text and the missing English version', async () => {
    const user = userEvent.setup()
    renderWithIntl(<AcademicActivityForm {...legacyArgs} />)

    expect(screen.getByText(/podría no estar en español/)).toBeInTheDocument()
    expect(field('Título (Español)')).toHaveAttribute('lang', '')
    expect(tab(/^English · Sin traducción$/)).toBeInTheDocument()

    await user.click(tab(/^English/))
    expect(screen.getByText(/aún no tiene versión en inglés/)).toBeInTheDocument()
    expect(field('Título (English)')).toHaveValue('')
  })

  test('saves a shared-field change without translating the activity', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<AcademicActivityForm {...legacyArgs} onSave={onSave} />)

    await replace(user, 'Ubicación', 'Cartago, Costa Rica')
    await save(user)

    const [draft, confirmed, newPhotoUrl] = onSave.mock.calls[0]!
    expect(buildUpdateRequest(legacyArgs.initial, draft, confirmed, newPhotoUrl)).toEqual({
      version: legacyArgs.initial.version,
      location: 'Cartago, Costa Rica',
    })
  })
})

describe('AcademicActivityForm: closing', () => {
  test('closes straight away when nothing changed', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderWithIntl(<AcademicActivityForm {...editArgs} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('asks before discarding changes, and discards once confirmed', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderWithIntl(<AcademicActivityForm {...addArgs} onCancel={onCancel} />)

    await user.type(field('Título (Español)'), 'Borrador')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(
      screen.getByRole('dialog', { name: 'Descartar cambios no guardados' }),
    ).toBeInTheDocument()
    expect(onCancel).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test('keeps editing when the discard question is dismissed', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderWithIntl(<AcademicActivityForm {...addArgs} onCancel={onCancel} />)

    await user.type(field('Título (Español)'), 'Borrador')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await user.click(screen.getByRole('button', { name: 'Seguir editando' }))

    expect(onCancel).not.toHaveBeenCalled()
    expect(field('Título (Español)')).toHaveValue('Borrador')
  })

  test('asks the same question when its parent requests closing', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const ref = createRef<AcademicActivityFormHandle>()
    renderWithIntl(<AcademicActivityForm {...addArgs} onCancel={onCancel} ref={ref} />)

    await user.type(field('Título (Español)'), 'Borrador')
    act(() => ref.current!.requestCancel())

    expect(
      screen.getByRole('dialog', { name: 'Descartar cambios no guardados' }),
    ).toBeInTheDocument()
    expect(onCancel).not.toHaveBeenCalled()
  })
})

describe('AcademicActivityForm: preventing duplicate submissions', () => {
  test('ignores a submit while busy, so a second click cannot send twice', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<AcademicActivityForm {...editArgs} busy onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Guardando...' }))

    expect(onSave).not.toHaveBeenCalled()
  })
})
