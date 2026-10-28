import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { renderWithIntl } from '@/app/lib/i18n/testing'
import { InitiativeForm } from './InitiativeForm'
import { Edit, Legacy } from './InitiativeForm.stories'

describe('InitiativeForm', () => {
  test('focuses invalid fields and retains both languages while completing a new initiative', async () => {
    const user = userEvent.setup()
    const save = vi.fn()
    renderWithIntl(<InitiativeForm onSave={save} onCancel={() => {}} />)
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(screen.getByRole('textbox', { name: /Título \(Español\)/ })).toHaveFocus()
    await user.type(screen.getByRole('textbox', { name: /Título \(Español\)/ }), 'Título')
    await user.type(screen.getByRole('textbox', { name: /Descripción \(Español\)/ }), 'Descripción')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(screen.getByRole('textbox', { name: /Título \(English\)/ })).toHaveFocus()
    await user.type(screen.getByRole('textbox', { name: /Título \(English\)/ }), 'Title')
    await user.type(screen.getByRole('textbox', { name: /Descripción \(English\)/ }), 'Description')
    await user.type(screen.getByRole('textbox', { name: /Sitio web oficial/ }), 'invalid')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(save).not.toHaveBeenCalled()
    expect(screen.getByRole('textbox', { name: /Sitio web oficial/ })).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    await user.clear(screen.getByRole('textbox', { name: /Sitio web oficial/ }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(save).toHaveBeenCalledWith({
      content: {
        es: { title: 'Título', description: 'Descripción' },
        en: { title: 'Title', description: 'Description' },
      },
      logoUrl: '',
      websiteUrl: '',
    })
  })
  test('requires explicit review of an unchanged translation and resets it when its source changes again', async () => {
    const user = userEvent.setup()
    const save = vi.fn()
    renderWithIntl(<InitiativeForm {...Edit.args} onSave={save} onCancel={() => {}} />, {
      locale: 'en',
    })
    expect(screen.getByRole('tab', { name: /Español/ })).toHaveAttribute('aria-selected', 'true')
    await user.type(screen.getByRole('textbox', { name: /Title \(Español\)/ }), ' updated')
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(save).not.toHaveBeenCalled()
    const review = screen.getByRole('switch')
    await user.click(review)
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ confirmedUnchanged: [{ locale: 'en', field: 'title' }] }),
    )
    save.mockClear()
    await user.click(screen.getByRole('tab', { name: /Español/ }))
    await user.type(screen.getByRole('textbox', { name: /Title \(Español\)/ }), ' again')
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(save).not.toHaveBeenCalled()
    expect(screen.getByRole('switch')).not.toBeChecked()
  })
  test('allows shared-only legacy edits and confirms discarding dirty values', async () => {
    const user = userEvent.setup()
    const save = vi.fn(),
      cancel = vi.fn()
    renderWithIntl(<InitiativeForm {...Legacy.args} onSave={save} onCancel={cancel} />)
    expect(screen.getByRole('textbox', { name: /Título \(Español\)/ })).toHaveAttribute('lang', '')
    await user.type(screen.getByRole('textbox', { name: /URL del logo/ }), '/brand/logo-ISWI.png')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(save).toHaveBeenCalledWith({
      logoUrl: '/brand/logo-ISWI.png',
      version: Legacy.args!.initiative!.editing!.version,
    })
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    const dialog = screen.getByRole('dialog', { name: 'Descartar cambios no guardados' })
    await user.click(within(dialog).getByRole('button', { name: 'Seguir editando' }))
    expect(cancel).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(cancel).toHaveBeenCalledOnce()
  })
  test('closes an untouched form immediately and disables input while saving', async () => {
    const cancel = vi.fn()
    const { rerender } = renderWithIntl(<InitiativeForm onCancel={cancel} onSave={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(cancel).toHaveBeenCalledOnce()
    rerender(<InitiativeForm busy onCancel={cancel} onSave={() => {}} />)
    expect(screen.getByRole('button', { name: 'Guardando…' })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: /Título \(Español\)/ })).toBeDisabled()
  })
})
