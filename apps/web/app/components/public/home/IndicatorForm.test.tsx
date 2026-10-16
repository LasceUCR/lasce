import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import { IndicatorForm, type IndicatorFormProps } from './IndicatorForm'
import { Bilingual, Legacy } from './IndicatorForm.stories'

const bilingual = Bilingual.args as IndicatorFormProps

function renderForm(props: Partial<IndicatorFormProps> = {}, locale: 'es' | 'en' = 'es') {
  const onSave = vi.fn()
  const onCancel = vi.fn()
  renderWithIntl(<IndicatorForm {...bilingual} onCancel={onCancel} onSave={onSave} {...props} />, {
    locale,
  })
  return { onSave, onCancel, user: userEvent.setup() }
}

describe('IndicatorForm', () => {
  test('shows the shared value outside the language tabs', () => {
    renderForm()

    const value = screen.getByRole('textbox', { name: 'Valor' })
    expect(value).toHaveValue('-12 nT')
    expect(value.closest('[role="tabpanel"]')).toBeNull()
    expect(screen.getByRole('textbox', { name: 'Descripción (Español)' })).toHaveValue('Estable')
  })

  test('accepts at most 15 characters in the value and in each description', async () => {
    const { user } = renderForm()
    const value = screen.getByRole('textbox', { name: 'Valor' })

    expect(value).toHaveAttribute('maxlength', '15')
    expect(screen.getByRole('textbox', { name: 'Descripción (Español)' })).toHaveAttribute(
      'maxlength',
      '15',
    )

    await user.clear(value)
    await user.type(value, '1234567890123456')
    expect(value).toHaveValue('123456789012345')
  })

  test('saves a value-only change without asking for a translation', async () => {
    const { onSave, user } = renderForm()

    await user.clear(screen.getByRole('textbox', { name: 'Valor' }))
    await user.type(screen.getByRole('textbox', { name: 'Valor' }), '-40 nT')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ value: '-40 nT' }), [])
  })

  test('requires a value', async () => {
    const { onSave, user } = renderForm()

    await user.clear(screen.getByRole('textbox', { name: 'Valor' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText('El valor es obligatorio.')).toBeVisible()
    expect(screen.getByRole('textbox', { name: 'Valor' })).toHaveFocus()
  })

  test('asks to review the other description after a one-sided change', async () => {
    const { onSave, user } = renderForm()

    await user.clear(screen.getByRole('textbox', { name: 'Descripción (Español)' }))
    await user.type(screen.getByRole('textbox', { name: 'Descripción (Español)' }), 'Perturbado')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('tab', { name: /English/ })).toHaveAttribute('aria-selected', 'true')

    await user.clear(screen.getByRole('textbox', { name: 'Descripción (English)' }))
    await user.type(screen.getByRole('textbox', { name: 'Descripción (English)' }), 'Disturbed')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        content: { es: { description: 'Perturbado' }, en: { description: 'Disturbed' } },
      }),
      [],
    )
  })

  test('asks before discarding unsaved changes', async () => {
    const { onCancel, user } = renderForm()

    await user.type(screen.getByRole('textbox', { name: 'Valor' }), '0')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    const dialog = screen.getByRole('dialog', { name: 'Descartar cambios no guardados' })
    await user.click(within(dialog).getByRole('button', { name: 'Descartar' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test('says the index has no English description yet', () => {
    renderForm(Legacy.args as IndicatorFormProps)

    expect(screen.getByRole('tab', { name: /English.*Sin traducción/ })).toBeInTheDocument()
  })

  test("speaks the site's language, in English", async () => {
    const { user } = renderForm({}, 'en')

    await user.clear(screen.getByRole('textbox', { name: 'Value' }))
    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(screen.getByText('The value is required.')).toBeVisible()
  })
})
