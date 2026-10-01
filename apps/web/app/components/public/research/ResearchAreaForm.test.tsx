import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  uploadResearchAreaImage: vi.fn(),
}))

vi.mock('@/app/(public)/investigacion/actions', () => ({
  uploadResearchAreaImage: mocks.uploadResearchAreaImage,
}))

import { ResearchAreaForm, type ResearchAreaFormProps } from './ResearchAreaForm'
import { Default } from './ResearchAreaForm.stories'

const defaultArgs = Default.args as ResearchAreaFormProps
const existingAreaArgs: ResearchAreaFormProps = {
  ...defaultArgs,
  area: {
    ...defaultArgs.area,
    src: 'https://s3.example/lasce/area-solar.png',
  },
}

URL.createObjectURL = vi.fn(() => 'blob:mock-url')
URL.revokeObjectURL = vi.fn()

describe('ResearchAreaForm', () => {
  test('starts pre-filled with the research area being edited', () => {
    render(<ResearchAreaForm {...existingAreaArgs} />)

    expect(screen.getByRole('textbox', { name: 'Título' })).toHaveValue(existingAreaArgs.area.title)
    expect(screen.getByRole('textbox', { name: 'Descripción' })).toHaveValue(
      existingAreaArgs.area.description,
    )
    expect(screen.getByRole('img')).toHaveAttribute('src', existingAreaArgs.area.src)
  })

  test('calls onCancel directly, without asking for confirmation', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()

    render(<ResearchAreaForm {...defaultArgs} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('shows the missing fields and does not open confirmation for an incomplete area', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(<ResearchAreaForm {...defaultArgs} onSave={onSave} />)

    await user.clear(screen.getByRole('textbox', { name: 'Título' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Falta completar: Foto, Título.')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('asks for confirmation before saving an existing area', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(<ResearchAreaForm {...existingAreaArgs} onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Guardar cambios' })).toBeInTheDocument()
  })

  test('saves edited values after confirmation while keeping the existing image', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(<ResearchAreaForm {...existingAreaArgs} onSave={onSave} />)

    await user.clear(screen.getByRole('textbox', { name: 'Título' }))
    await user.type(screen.getByRole('textbox', { name: 'Título' }), 'Nueva área')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    const dialog = screen.getByRole('dialog', { name: 'Guardar cambios' })
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith({
      title: 'Nueva área',
      description: existingAreaArgs.area.description,
      src: existingAreaArgs.area.src,
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('uploads a selected image and saves with the returned public URL', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    mocks.uploadResearchAreaImage.mockResolvedValue({
      ok: true,
      imageUrl: 'https://s3.example/lasce/123_nueva.png',
    })

    render(<ResearchAreaForm {...defaultArgs} onSave={onSave} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['imagen'], 'nueva.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    await user.click(
      within(screen.getByRole('dialog', { name: 'Guardar cambios' })).getByRole('button', {
        name: 'Confirmar',
      }),
    )

    expect(mocks.uploadResearchAreaImage).toHaveBeenCalledTimes(1)
    const formData = mocks.uploadResearchAreaImage.mock.calls[0]![0] as FormData
    expect((formData.get('file') as File).name).toBe('nueva.png')
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ src: 'https://s3.example/lasce/123_nueva.png' }),
    )
  })

  test('shows the upload error and does not save when the upload is rejected', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    mocks.uploadResearchAreaImage.mockResolvedValue({
      ok: false,
      error: 'La imagen es demasiado grande.',
    })

    render(<ResearchAreaForm {...defaultArgs} onSave={onSave} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['imagen'], 'nueva.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    await user.click(
      within(screen.getByRole('dialog', { name: 'Guardar cambios' })).getByRole('button', {
        name: 'Confirmar',
      }),
    )

    expect(await screen.findByText('La imagen es demasiado grande.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('recovers after the upload throws and allows retrying', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    mocks.uploadResearchAreaImage.mockRejectedValue(new Error('network error'))

    render(<ResearchAreaForm {...defaultArgs} onSave={onSave} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['imagen'], 'nueva.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    await user.click(
      within(screen.getByRole('dialog', { name: 'Guardar cambios' })).getByRole('button', {
        name: 'Confirmar',
      }),
    )

    expect(
      await screen.findByText('No se pudo subir la imagen. Inténtelo de nuevo.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar' })).not.toBeDisabled()
    expect(onSave).not.toHaveBeenCalled()
  })
})
