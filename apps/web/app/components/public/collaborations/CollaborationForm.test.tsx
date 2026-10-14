import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { renderWithIntl } from '@/app/lib/i18n/testing'
import { CollaborationForm, type CollaborationFormHandle } from './CollaborationForm'
import { Create, Edit, Legacy } from './CollaborationForm.stories'

describe('CollaborationForm', () => {
  test('requires name and country in both languages, retains input across tabs and submits optional-free content', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<CollaborationForm {...Create.args} onSave={onSave} onCancel={() => {}} />)
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/Nombre de la organización/)).toHaveFocus()
    await user.type(screen.getByLabelText(/Nombre de la organización/), 'New partner')
    await user.type(screen.getByLabelText('País (Español)', { exact: false }), 'Alemania')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(screen.getByRole('tab', { name: /English/ })).toHaveAttribute('aria-selected', 'true')
    await user.type(screen.getByLabelText('País (English)', { exact: false }), 'Germany')
    await user.click(screen.getByRole('tab', { name: /Español/ }))
    expect(screen.getByLabelText('País (Español)', { exact: false })).toHaveValue('Alemania')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(onSave).toHaveBeenCalledWith({
      name: 'New partner',
      scope: 'national',
      acronym: '',
      websiteUrl: '',
      content: { es: { country: 'Alemania' }, en: { country: 'Germany' } },
    })
  })
  test('clears optional fields and only submits changed shared fields with their version', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<CollaborationForm {...Edit.args} onSave={onSave} onCancel={() => {}} />)
    await user.clear(screen.getByLabelText('Sitio web (opcional)'))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(onSave).toHaveBeenCalledWith({
      websiteUrl: '',
      version: Edit.args!.collaboration!.editing!.version,
    })
  })
  test('requires cross-language review when a country changes in only one language', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<CollaborationForm {...Edit.args} onSave={onSave} onCancel={() => {}} />)
    await user.clear(screen.getByLabelText('País (Español)', { exact: false }))
    await user.type(screen.getByLabelText('País (Español)', { exact: false }), 'República Italiana')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(onSave).not.toHaveBeenCalled()
    await user.click(screen.getByRole('switch'))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ confirmedUnchanged: [{ locale: 'en', field: 'country' }] }),
    )
  })
  test('can edit a legacy shared field without inventing or requiring a translation', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<CollaborationForm {...Legacy.args} onSave={onSave} onCancel={() => {}} />)
    await user.type(screen.getByLabelText(/Nombre de la organización/), ' revised')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(onSave).toHaveBeenCalledWith({
      name: 'Institute revised',
      version: Legacy.args!.collaboration!.editing!.version,
    })
  })
  test('uses English validation, rejects unsafe links and keeps entered values', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<CollaborationForm {...Edit.args} onSave={onSave} onCancel={() => {}} />, {
      locale: 'en',
    })
    await user.clear(screen.getByLabelText('Website (optional)'))
    await user.type(screen.getByLabelText('Website (optional)'), 'javascript:alert(1)')
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText(/Enter a valid HTTP/)).toBeVisible()
    expect(screen.getByRole('textbox', { name: 'Website (optional)' })).toHaveValue(
      'javascript:alert(1)',
    )
  })
  test('asks before discarding changed input and preserves it when continuing', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const ref = createRef<CollaborationFormHandle>()
    renderWithIntl(<CollaborationForm ref={ref} onSave={() => {}} onCancel={onCancel} />)
    await user.type(screen.getByLabelText(/Nombre de la organización/), 'Draft')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    const dialog = screen.getByRole('dialog', { name: 'Descartar cambios no guardados' })
    await user.click(within(dialog).getByRole('button', { name: 'Seguir editando' }))
    expect(screen.getByLabelText(/Nombre de la organización/)).toHaveValue('Draft')
    expect(onCancel).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })
  test('closes an untouched form immediately and prevents submitting while saving', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const view = renderWithIntl(<CollaborationForm onSave={() => {}} onCancel={onCancel} />)
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalledOnce()
    view.rerender(<CollaborationForm busy onSave={() => {}} onCancel={onCancel} />)
    expect(screen.getByRole('button', { name: 'Guardando...' })).toBeDisabled()
  })
})
