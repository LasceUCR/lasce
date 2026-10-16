import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import { HomeHeroForm, type HomeHeroFormProps } from './HomeHeroForm'
import { Bilingual, Legacy } from './HomeHeroForm.stories'

const bilingual = Bilingual.args as HomeHeroFormProps

function renderForm(props: Partial<HomeHeroFormProps> = {}, locale: 'es' | 'en' = 'es') {
  const onSave = vi.fn()
  const onCancel = vi.fn()
  renderWithIntl(<HomeHeroForm {...bilingual} onCancel={onCancel} onSave={onSave} {...props} />, {
    locale,
  })
  return { onSave, onCancel, user: userEvent.setup() }
}

function panel(name: RegExp) {
  return screen.getByRole('tabpanel', { name })
}

describe('HomeHeroForm', () => {
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

  test('limits the title and subtitle to what the API accepts', () => {
    renderForm()

    expect(screen.getByRole('textbox', { name: 'Título (Español)' })).toHaveAttribute(
      'maxlength',
      '120',
    )
    expect(screen.getByRole('textbox', { name: 'Subtítulo (Español)' })).toHaveAttribute(
      'maxlength',
      '300',
    )
  })

  test('requires the text in both languages, opening the tab that is missing it', async () => {
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
  })

  test('asks to update or confirm the other language after a one-sided change', async () => {
    const { onSave, user } = renderForm()

    await user.type(screen.getByRole('textbox', { name: 'Subtítulo (Español)' }), ' Más.')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(onSave).not.toHaveBeenCalled()

    await user.click(screen.getByRole('tab', { name: /English/ }))
    await user.click(within(panel(/English/)).getByRole('switch'))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        es: expect.objectContaining({ lead: `${bilingual.initial.draft.es.lead} Más.` }) as object,
      }),
      [{ locale: 'en', field: 'lead' }],
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

  test('says a banner has no English version yet', () => {
    renderForm(Legacy.args as HomeHeroFormProps)

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
