import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { renderWithIntl } from '@/app/lib/i18n/testing'
import { InitiativeForm } from './InitiativeForm'
import { Edit, Legacy, WithLogo } from './InitiativeForm.stories'

const logoUrl = '/api/initiatives/logos/01200000-0000-4000-8000-000000000003.png'
const onUploadLogo = async () => logoUrl

describe('InitiativeForm', () => {
  test('focuses invalid fields and retains both languages while completing a new initiative', async () => {
    const user = userEvent.setup()
    const save = vi.fn()
    renderWithIntl(<InitiativeForm onUploadLogo={onUploadLogo} onSave={save} onCancel={() => {}} />)
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
    renderWithIntl(
      <InitiativeForm
        {...Edit.args}
        onUploadLogo={onUploadLogo}
        onSave={save}
        onCancel={() => {}}
      />,
      {
        locale: 'en',
      },
    )
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
    renderWithIntl(
      <InitiativeForm
        {...Legacy.args}
        onUploadLogo={onUploadLogo}
        onSave={save}
        onCancel={cancel}
      />,
    )
    expect(screen.getByRole('textbox', { name: /Título \(Español\)/ })).toHaveAttribute('lang', '')
    await user.upload(
      document.querySelector('input[type="file"]') as HTMLInputElement,
      new File(['logo'], 'logo.png', { type: 'image/png' }),
    )
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(save).toHaveBeenCalledWith({
      logoUrl,
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
    const { rerender } = renderWithIntl(
      <InitiativeForm onUploadLogo={onUploadLogo} onCancel={cancel} onSave={() => {}} />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(cancel).toHaveBeenCalledOnce()
    rerender(
      <InitiativeForm busy onUploadLogo={onUploadLogo} onCancel={cancel} onSave={() => {}} />,
    )
    expect(screen.getByRole('button', { name: 'Guardando…' })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: /Título \(Español\)/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Logo (opcional)' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })
  test('keeps a selected image after upload failure and reuses its successful upload on save retry', async () => {
    const user = userEvent.setup()
    const upload = vi.fn().mockResolvedValueOnce(null).mockResolvedValue(logoUrl)
    const save = vi.fn()
    renderWithIntl(
      <InitiativeForm {...Edit.args} onUploadLogo={upload} onSave={save} onCancel={() => {}} />,
    )
    const file = new File(['logo'], 'logo.png', { type: 'image/png' })
    await user.upload(document.querySelector('input[type="file"]') as HTMLInputElement, file)
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(save).not.toHaveBeenCalled()
    expect(screen.getByRole('img')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(save).toHaveBeenCalledWith({ logoUrl, version: Edit.args!.initiative!.editing!.version })
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(upload).toHaveBeenCalledTimes(2)
    expect(save).toHaveBeenCalledTimes(2)
  })
  test('removes an existing logo without uploading a new file', async () => {
    const user = userEvent.setup()
    const save = vi.fn()
    const upload = vi.fn()
    renderWithIntl(
      <InitiativeForm {...WithLogo.args} onUploadLogo={upload} onSave={save} onCancel={() => {}} />,
    )
    await user.click(screen.getByRole('button', { name: 'Quitar imagen' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(upload).not.toHaveBeenCalled()
    expect(save).toHaveBeenCalledWith({
      logoUrl: '',
      version: Edit.args!.initiative!.editing!.version,
    })
  })
})
