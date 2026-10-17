import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import { renderWithIntl } from '@/app/lib/i18n/testing'

const mocks = vi.hoisted(() => ({
  uploadResearchAreaImage: vi.fn(),
}))

vi.mock('@/app/(public)/investigacion/actions', () => ({
  uploadResearchAreaImage: mocks.uploadResearchAreaImage,
}))

import { ResearchAreaForm, type ResearchAreaFormProps } from './ResearchAreaForm'
import { Create, EditBilingual, EditLegacy } from './ResearchAreaForm.stories'

const createArgs = Create.args as ResearchAreaFormProps
const bilingualArgs = EditBilingual.args as ResearchAreaFormProps
const legacyArgs = EditLegacy.args as ResearchAreaFormProps

URL.createObjectURL = vi.fn(() => 'blob:mock-url')
URL.revokeObjectURL = vi.fn()

function renderForm(props: ResearchAreaFormProps, locale: 'es' | 'en' = 'es') {
  const onSave = vi.fn()
  const onCancel = vi.fn()
  renderWithIntl(
    <ToastProvider>
      <ResearchAreaForm {...props} onCancel={onCancel} onSave={onSave} />
    </ToastProvider>,
    { locale },
  )
  return { onSave, onCancel, user: userEvent.setup() }
}

async function choosePhoto(user: ReturnType<typeof userEvent.setup>) {
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
  await user.upload(fileInput, new File(['imagen'], 'nueva.png', { type: 'image/png' }))
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('ResearchAreaForm', () => {
  test('opens on the Spanish tab with both languages and the photo loaded', () => {
    renderForm(bilingualArgs)

    expect(screen.getByRole('tab', { name: /Español/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('textbox', { name: 'Título (Español)' })).toHaveValue(
      bilingualArgs.initial.draft.es.title,
    )
    expect(screen.getByRole('textbox', { name: 'Título (English)', hidden: true })).toHaveValue(
      bilingualArgs.initial.draft.en.title,
    )
    expect(screen.getByRole('img')).toHaveAttribute('src', bilingualArgs.initial.src)
  })

  test('requires both languages and the photo when creating, opening on the problem', async () => {
    const { onSave, user } = renderForm(createArgs)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText('El título en español es obligatorio.')).toBeVisible()
    expect(screen.getByText('La imagen es obligatoria.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Título (Español)' })).toHaveFocus()
    expect(mocks.uploadResearchAreaImage).not.toHaveBeenCalled()
  })

  test('creates in both languages, uploading the photo first', async () => {
    mocks.uploadResearchAreaImage.mockResolvedValue({ ok: true, imageUrl: 'https://s3/nueva.png' })
    const { onSave, user } = renderForm(createArgs)

    await user.type(screen.getByRole('textbox', { name: 'Título (Español)' }), 'Geomagnetismo')
    await user.type(screen.getByRole('textbox', { name: 'Descripción (Español)' }), 'Estudia.')
    await user.click(screen.getByRole('tab', { name: /English/ }))
    await user.type(screen.getByRole('textbox', { name: 'Título (English)' }), 'Geomagnetism')
    await user.type(screen.getByRole('textbox', { name: 'Descripción (English)' }), 'Studies.')
    await choosePhoto(user)
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    const formData = mocks.uploadResearchAreaImage.mock.calls[0]?.[0] as FormData
    expect((formData.get('file') as File).name).toBe('nueva.png')
    expect(onSave).toHaveBeenCalledWith({
      draft: {
        es: { title: 'Geomagnetismo', description: 'Estudia.' },
        en: { title: 'Geomagnetism', description: 'Studies.' },
      },
      confirmed: [],
      src: 'https://s3/nueva.png',
    })
  })

  test('asks to update or confirm the other language after a one-sided change', async () => {
    const { onSave, user } = renderForm(bilingualArgs)

    await user.type(screen.getByRole('textbox', { name: 'Título (Español)' }), ' regional')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('tab', { name: /English/ })).toHaveAttribute('aria-selected', 'true')

    const englishPanel = screen.getByRole('tabpanel', { name: /English/ })
    await user.click(within(englishPanel).getByRole('switch'))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ confirmed: [{ locale: 'en', field: 'title' }] }),
    )
  })

  test('lets a legacy area change its photo without translating it', async () => {
    mocks.uploadResearchAreaImage.mockResolvedValue({ ok: true, imageUrl: 'https://s3/nueva.png' })
    const { onSave, user } = renderForm(legacyArgs)

    expect(screen.getByRole('tab', { name: /English.*Sin traducción/ })).toBeInTheDocument()
    expect(screen.getByText(/podría no estar en español/)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Título (Español)' })).toHaveAttribute('lang', '')

    await choosePhoto(user)
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ draft: legacyArgs.initial.draft, src: 'https://s3/nueva.png' }),
    )
  })

  test('reports a rejected photo in a toast and keeps the form open', async () => {
    mocks.uploadResearchAreaImage.mockResolvedValue({
      ok: false,
      error: 'La imagen es muy grande.',
    })
    const { onSave, user } = renderForm(legacyArgs)

    await choosePhoto(user)
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('La imagen es muy grande.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('reports an upload that never reached the server, and lets the admin retry', async () => {
    mocks.uploadResearchAreaImage.mockRejectedValueOnce(new Error('network error'))
    mocks.uploadResearchAreaImage.mockResolvedValueOnce({ ok: true, imageUrl: 'https://s3/b.png' })
    const { onSave, user } = renderForm(legacyArgs)

    await choosePhoto(user)
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(
      await screen.findByText('No se pudo subir la imagen. Inténtelo de nuevo.'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ src: 'https://s3/b.png' }))
  })

  test('closes at once when nothing changed', async () => {
    const { onCancel, user } = renderForm(bilingualArgs)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('asks before discarding unsaved changes', async () => {
    const { onCancel, user } = renderForm(bilingualArgs)

    await user.type(screen.getByRole('textbox', { name: 'Título (Español)' }), '!')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    const dialog = screen.getByRole('dialog', { name: 'Descartar cambios no guardados' })
    await user.click(within(dialog).getByRole('button', { name: 'Seguir editando' }))
    expect(onCancel).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test("speaks the site's language, in English", async () => {
    const { user } = renderForm(createArgs, 'en')

    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(screen.getByRole('textbox', { name: 'Title (Español)' })).toBeInTheDocument()
    expect(screen.getByText('The Spanish title is required.')).toBeVisible()
    expect(screen.getByText('The image is required.')).toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: 'Content language' })).toBeInTheDocument()
  })
})
