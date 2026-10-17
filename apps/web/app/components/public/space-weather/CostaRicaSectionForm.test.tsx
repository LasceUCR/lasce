import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import { CostaRicaSectionForm, type CostaRicaSectionFormProps } from './CostaRicaSectionForm'
import { Bilingual, Legacy } from './CostaRicaSectionForm.stories'

const bilingual = Bilingual.args as CostaRicaSectionFormProps

function renderForm(props: Partial<CostaRicaSectionFormProps> = {}, locale: 'es' | 'en' = 'es') {
  const onSave = vi.fn()
  const onCancel = vi.fn()
  renderWithIntl(
    <CostaRicaSectionForm {...bilingual} onCancel={onCancel} onSave={onSave} {...props} />,
    {
      locale,
    },
  )
  return { onSave, onCancel, user: userEvent.setup() }
}

function panel(name: RegExp) {
  return screen.getByRole('tabpanel', { name })
}

describe('CostaRicaSectionForm', () => {
  test('opens on the Spanish tab with both languages loaded', () => {
    renderForm()

    expect(screen.getByRole('tab', { name: /Español/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('textbox', { name: 'Título (Español)' })).toHaveValue(
      bilingual.initial.draft.es.title,
    )
    expect(screen.getByRole('textbox', { name: 'Título (English)', hidden: true })).toHaveValue(
      bilingual.initial.draft.en.title,
    )
  })

  test('limits the title and text to what the API accepts', () => {
    renderForm()

    expect(screen.getByRole('textbox', { name: 'Título (Español)' })).toHaveAttribute(
      'maxlength',
      '160',
    )
    expect(screen.getByRole('textbox', { name: 'Texto (Español)' })).toHaveAttribute(
      'maxlength',
      '5000',
    )
  })

  test('opens without errors and with "Confirmar" enabled', () => {
    renderForm()

    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeEnabled()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  test('shows no error while typing, before "Confirmar" is pressed', async () => {
    const { user } = renderForm()

    await user.click(screen.getByRole('tab', { name: /English/ }))
    await user.clear(screen.getByRole('textbox', { name: 'Título (English)' }))

    expect(screen.queryByText('El título en inglés es obligatorio.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeEnabled()
  })

  test('on "Confirmar", opens the tab with the error and focuses its field', async () => {
    const { onSave, user } = renderForm()

    await user.type(screen.getByRole('textbox', { name: 'Título (Español)' }), '!')
    await user.click(screen.getByRole('tab', { name: /English/ }))
    await user.clear(screen.getByRole('textbox', { name: 'Título (English)' }))
    await user.click(screen.getByRole('tab', { name: /Español/ }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('tab', { name: /English/ })).toHaveAttribute('aria-selected', 'true')
    expect(within(panel(/English/)).getByText('El título en inglés es obligatorio.')).toBeVisible()
    expect(screen.getByRole('textbox', { name: 'Título (English)' })).toHaveFocus()

    await user.type(screen.getByRole('textbox', { name: 'Título (English)' }), 'New title')

    expect(screen.queryByText('El título en inglés es obligatorio.')).not.toBeInTheDocument()
  })

  test('counts the errors of a hidden tab on that tab, with no summary below the form', async () => {
    const { user } = renderForm()

    await user.click(screen.getByRole('tab', { name: /English/ }))
    await user.clear(screen.getByRole('textbox', { name: 'Texto (English)' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    await user.click(screen.getByRole('tab', { name: /Español/ }))

    expect(screen.getByRole('tab', { name: /English.*1/ })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  test('leads to the other language after a one-sided change, to update or confirm it', async () => {
    const { onSave, user } = renderForm()

    await user.type(screen.getByRole('textbox', { name: 'Texto (Español)' }), ' Más.')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('tab', { name: /English/ })).toHaveAttribute('aria-selected', 'true')

    await user.click(within(panel(/English/)).getByRole('switch'))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        es: expect.objectContaining({ body: `${bilingual.initial.draft.es.body} Más.` }) as object,
      }),
      [{ locale: 'en', field: 'body' }],
    )
  })

  test('saves a change made in both languages without asking', async () => {
    const { onSave, user } = renderForm()

    await user.type(screen.getByRole('textbox', { name: 'Título (Español)' }), '!')
    await user.click(screen.getByRole('tab', { name: /English/ }))
    await user.type(screen.getByRole('textbox', { name: 'Título (English)' }), '!')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith(expect.any(Object), [])
  })

  test('explains that a blank line starts a new paragraph', () => {
    renderForm()

    expect(
      within(panel(/Español/)).getByText('Separe los párrafos con una línea en blanco.'),
    ).toBeVisible()
  })

  test('closes at once when nothing changed', async () => {
    const { onCancel, user } = renderForm()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test('asks before discarding unsaved changes', async () => {
    const { onCancel, user } = renderForm()

    await user.type(screen.getByRole('textbox', { name: 'Título (Español)' }), '!')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    const dialog = screen.getByRole('dialog', { name: 'Descartar cambios no guardados' })
    await user.click(within(dialog).getByRole('button', { name: 'Seguir editando' }))
    expect(onCancel).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test('says a section has no English version yet', () => {
    renderForm(Legacy.args as CostaRicaSectionFormProps)

    expect(screen.getByRole('tab', { name: /English.*Sin traducción/ })).toBeInTheDocument()
    expect(screen.getByText(/podría no estar en español/)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Título (Español)' })).toHaveAttribute('lang', '')
  })

  test("speaks the site's language, in English", () => {
    renderForm({}, 'en')

    expect(screen.getByRole('textbox', { name: 'Title (Español)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: 'Content language' })).toBeInTheDocument()
  })
})
