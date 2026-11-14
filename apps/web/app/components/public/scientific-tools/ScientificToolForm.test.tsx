import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'
import { ScientificToolForm, type ScientificToolFormProps } from './ScientificToolForm'
import { Edit, Legacy, Saving } from './ScientificToolForm.stories'

const imageUrl = '/api/scientific-tools/images/38300000-0000-4000-8000-000000000009.png'

function renderForm(props: Partial<ScientificToolFormProps> = {}, locale: 'es' | 'en' = 'es') {
  const handlers = {
    onSave: vi.fn(),
    onCancel: vi.fn(),
    onUploadImage: vi.fn(async () => imageUrl),
  }
  renderWithIntl(<ScientificToolForm {...handlers} {...props} />, { locale })
  return handlers
}

describe('ScientificToolForm', () => {
  test('points at each missing field and language before saving a new tool', async () => {
    const user = userEvent.setup()
    const { onSave } = renderForm()

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(screen.getByRole('textbox', { name: /^Nombre/ })).toHaveFocus()
    expect(screen.getByText('El nombre es obligatorio.')).toBeVisible()
    await user.type(screen.getByRole('textbox', { name: /^Nombre/ }), 'SWAAT')
    await user.type(screen.getByRole('textbox', { name: /Descripción \(Español\)/ }), 'Análisis.')
    await user.type(screen.getByRole('textbox', { name: /Enlace de acceso/ }), 'http://swaat.test')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.getByRole('tab', { name: /English/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('textbox', { name: /Descripción \(English\)/ })).toHaveFocus()
    expect(screen.getByRole('textbox', { name: /Enlace de acceso/ })).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(screen.getByText('Ingrese una dirección https válida, sin credenciales.')).toBeVisible()
    expect(screen.getByRole('textbox', { name: /^Nombre/ })).toHaveValue('SWAAT')
    expect(onSave).not.toHaveBeenCalled()

    await user.type(screen.getByRole('textbox', { name: /Descripción \(English\)/ }), 'Analysis.')
    const url = screen.getByRole('textbox', { name: /Enlace de acceso/ })
    await user.clear(url)
    await user.type(url, 'https://swaat.test')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(onSave).toHaveBeenCalledWith({
      name: 'SWAAT',
      accessUrl: 'https://swaat.test',
      imageUrl: '',
      content: { es: { description: 'Análisis.' }, en: { description: 'Analysis.' } },
    })
  })

  test('asks to review the other language when only one description changed', async () => {
    const user = userEvent.setup()
    const { onSave } = renderForm(Edit.args, 'en')

    await user.type(screen.getByRole('textbox', { name: /Description \(Español\)/ }), ' Nuevo.')
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onSave).not.toHaveBeenCalled()
    await user.click(screen.getByRole('switch'))
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ confirmedUnchanged: [{ locale: 'en', field: 'description' }] }),
    )
  })

  test('saves an unchanged edit as nothing to send', async () => {
    const user = userEvent.setup()
    const { onSave } = renderForm(Edit.args)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(onSave).toHaveBeenCalledWith(null)
  })

  test('lets a legacy tool change its shared fields without translating it', async () => {
    const user = userEvent.setup()
    const { onSave } = renderForm(Legacy.args)

    expect(screen.getAllByText(/conserva su texto original/)[0]).toBeVisible()
    await user.type(screen.getByRole('textbox', { name: /^Nombre/ }), ' 2')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(onSave).toHaveBeenCalledWith({
      name: 'SWAAT 2',
      version: Legacy.args!.tool!.editing!.version,
    })
  })

  test('reuses an uploaded image when a failed save is retried', async () => {
    const user = userEvent.setup()
    const { onSave, onUploadImage } = renderForm(Edit.args)

    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!
    await user.upload(input, new File(['png'], 'tool.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onUploadImage).toHaveBeenCalledOnce()
    expect(onSave).toHaveBeenNthCalledWith(2, expect.objectContaining({ imageUrl }))
  })

  test('does not save when the image upload fails', async () => {
    const user = userEvent.setup()
    const { onSave } = renderForm({ ...Edit.args, onUploadImage: vi.fn(async () => null) })

    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!
    await user.upload(input, new File(['png'], 'tool.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(onSave).not.toHaveBeenCalled()
  })

  test('confirms before discarding changes and closes an untouched form at once', async () => {
    const user = userEvent.setup()
    const { onCancel } = renderForm(Edit.args)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalledOnce()
    onCancel.mockClear()
    await user.type(screen.getByRole('textbox', { name: /^Nombre/ }), ' 2')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  test('disables every control while saving', () => {
    renderForm(Saving.args)

    expect(screen.getByRole('button', { name: 'Guardando…' })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: /^Nombre/ })).toBeDisabled()
  })
})
