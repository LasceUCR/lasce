import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  uploadConstructionStageImage: vi.fn(),
}))

vi.mock('@/app/(public)/radioastronomia/actions', () => ({
  uploadConstructionStageImage: mocks.uploadConstructionStageImage,
}))

URL.createObjectURL = vi.fn(() => 'blob:mock-url')
URL.revokeObjectURL = vi.fn()

import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import { renderWithIntl } from '@/app/lib/i18n/testing'

import { RosacStageForm, type RosacStageFormProps } from './RosacStageForm'

/** The form reports a failed upload with a toast, so it renders inside the app's providers. */
function render(ui: ReactElement, options?: Parameters<typeof renderWithIntl>[1]) {
  return renderWithIntl(<ToastProvider>{ui}</ToastProvider>, options)
}

const sampleImages = [
  {
    src: '/images/ROSAC/construction/Preparacion%20Montaje/prev_montaje_1.jpg',
    alt: 'Personas sobre y alrededor de una base de concreto, con una antena al fondo.',
  },
  {
    src: '/images/ROSAC/construction/Preparacion%20Montaje/prev_montaje_2.jpg',
    alt: 'Camión con grúa y componentes metálicos junto al sitio de la antena.',
  },
] as const

const defaultArgs: RosacStageFormProps = {
  stage: {
    title: 'Preparación para el montaje',
    description:
      'Antes del montaje principal se realizaron trabajos de preparación del sitio y de los componentes que posteriormente formarían parte de la estructura.',
    images: sampleImages,
  },
  onCancel: vi.fn(),
  onSave: vi.fn(),
}

describe('RosacStageForm', () => {
  test('starts pre-filled with the stage being edited', () => {
    render(<RosacStageForm {...defaultArgs} />)

    expect(screen.getByRole('textbox', { name: 'Título' })).toHaveValue(defaultArgs.stage.title)
    expect(screen.getByRole('textbox', { name: 'Descripción' })).toHaveValue(
      defaultArgs.stage.description,
    )
    expect(screen.getByRole('button', { name: 'Editar fotografías' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Añadir fotografía' })).toBeInTheDocument()
    expect(screen.getByText('2 fotografías registradas')).toBeInTheDocument()
  })

  test('calls onCancel directly when untouched', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<RosacStageForm {...defaultArgs} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('prompts to discard changes when modified and cancelled', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<RosacStageForm {...defaultArgs} onCancel={onCancel} />)

    const titleInput = screen.getByRole('textbox', { name: 'Título' })
    await user.clear(titleInput)
    await user.type(titleInput, 'Título Modificado')

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    const discardDialog = screen.getByRole('dialog', { name: 'Descartar cambios no guardados' })
    expect(discardDialog).toBeInTheDocument()

    await user.click(within(discardDialog).getByRole('button', { name: 'Descartar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test('shows validation errors when fields are empty', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<RosacStageForm {...defaultArgs} onSave={onSave} />)

    const titleInput = screen.getByRole('textbox', { name: 'Título' })
    await user.clear(titleInput)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.getByText('El título es obligatorio.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('saves changes directly without save confirmation dialog', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<RosacStageForm {...defaultArgs} onSave={onSave} />)

    const titleInput = screen.getByRole('textbox', { name: 'Título' })
    await user.clear(titleInput)
    await user.type(titleInput, 'Etapa Modificada')

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onSave).toHaveBeenCalledWith({
      title: 'Etapa Modificada',
      description: defaultArgs.stage.description,
      images: defaultArgs.stage.images,
    })
  })

  test('allows editing alt text of an existing photo via the edit photos modal', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<RosacStageForm {...defaultArgs} onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Editar fotografías' }))

    const editDialog = screen.getByRole('dialog', { name: 'Editar fotografías' })
    expect(editDialog).toBeInTheDocument()

    const altInput = within(editDialog).getByRole('textbox', {
      name: 'Texto alternativo de la fotografía 1',
    })
    await user.clear(altInput)
    await user.type(altInput, 'Nueva descripción accesible')

    await user.click(within(editDialog).getByRole('button', { name: 'Guardar fotografías' }))
    expect(screen.queryByRole('dialog', { name: 'Editar fotografías' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        images: expect.arrayContaining([
          expect.objectContaining({
            src: sampleImages[0].src,
            alt: 'Nueva descripción accesible',
          }),
        ]),
      }),
    )
  })

  test('prompts to confirm deletion and removes a photo via the edit photos modal', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<RosacStageForm {...defaultArgs} onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Editar fotografías' }))

    const editDialog = screen.getByRole('dialog', { name: 'Editar fotografías' })
    const deleteButton = within(editDialog).getByRole('button', {
      name: 'Eliminar fotografía 1',
    })
    await user.click(deleteButton)

    // Confirm dialog must appear
    const deleteConfirmDialog = screen.getByRole('dialog', { name: 'Eliminar fotografía' })
    expect(deleteConfirmDialog).toBeInTheDocument()

    await user.click(within(deleteConfirmDialog).getByRole('button', { name: 'Eliminar' }))
    expect(screen.queryByRole('dialog', { name: 'Eliminar fotografía' })).not.toBeInTheDocument()

    await user.click(within(editDialog).getByRole('button', { name: 'Guardar fotografías' }))
    expect(screen.queryByRole('dialog', { name: 'Editar fotografías' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        images: [sampleImages[1]],
      }),
    )
  })

  test('cancels photo deletion when dismissed from confirmation dialog', async () => {
    const user = userEvent.setup()
    render(<RosacStageForm {...defaultArgs} />)

    await user.click(screen.getByRole('button', { name: 'Editar fotografías' }))

    const editDialog = screen.getByRole('dialog', { name: 'Editar fotografías' })
    const deleteButton = within(editDialog).getByRole('button', {
      name: 'Eliminar fotografía 1',
    })
    await user.click(deleteButton)

    const deleteConfirmDialog = screen.getByRole('dialog', { name: 'Eliminar fotografía' })
    expect(deleteConfirmDialog).toBeInTheDocument()

    await user.click(within(deleteConfirmDialog).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog', { name: 'Eliminar fotografía' })).not.toBeInTheDocument()

    // Photo 1 is still present
    expect(
      within(editDialog).getByRole('textbox', { name: 'Texto alternativo de la fotografía 1' }),
    ).toBeInTheDocument()
  })

  test('allows adding a new photo with custom alt text via the add photo modal', async () => {
    const user = userEvent.setup()
    mocks.uploadConstructionStageImage.mockResolvedValueOnce({
      ok: true,
      imageUrl: '/images/uploaded.jpg',
    })
    const onSave = vi.fn()
    render(<RosacStageForm {...defaultArgs} onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Añadir fotografía' }))

    const addDialog = screen.getByRole('dialog', { name: 'Añadir fotografía' })
    expect(addDialog).toBeInTheDocument()

    const file = new File(['fake-image'], 'foto.jpg', { type: 'image/jpeg' })
    const fileInput = addDialog.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, file)

    const newAltInput = within(addDialog).getByRole('textbox', {
      name: 'Texto alternativo accesible (alt)',
    })
    await user.type(newAltInput, 'Foto de la nueva grúa')

    await user.click(within(addDialog).getByRole('button', { name: 'Añadir fotografía' }))
    expect(screen.queryByRole('dialog', { name: 'Añadir fotografía' })).not.toBeInTheDocument()

    expect(screen.getByText('3 fotografías registradas')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(mocks.uploadConstructionStageImage).toHaveBeenCalled()
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        images: expect.arrayContaining([
          expect.objectContaining({
            src: '/images/uploaded.jpg',
            alt: 'Foto de la nueva grúa',
          }),
        ]),
      }),
    )
  })

  test('shows the error in a toast and does not save when a photo upload fails', async () => {
    const user = userEvent.setup()
    mocks.uploadConstructionStageImage.mockResolvedValueOnce({
      ok: false,
      error: 'La imagen es demasiado grande.',
    })
    const onSave = vi.fn()
    render(<RosacStageForm {...defaultArgs} onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Añadir fotografía' }))
    const addDialog = screen.getByRole('dialog', { name: 'Añadir fotografía' })
    const fileInput = addDialog.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['fake-image'], 'foto.jpg', { type: 'image/jpeg' }))
    await user.click(within(addDialog).getByRole('button', { name: 'Añadir fotografía' }))

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('La imagen es demasiado grande.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
    // A toast, not a custom message inside the form.
    expect(document.querySelector('.cms-form .form-alert')).toBeNull()
  })

  test('shows a toast when a photo upload throws', async () => {
    const user = userEvent.setup()
    mocks.uploadConstructionStageImage.mockRejectedValueOnce(new Error('network error'))
    const onSave = vi.fn()
    render(<RosacStageForm {...defaultArgs} onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Añadir fotografía' }))
    const addDialog = screen.getByRole('dialog', { name: 'Añadir fotografía' })
    const fileInput = addDialog.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['fake-image'], 'foto.jpg', { type: 'image/jpeg' }))
    await user.click(within(addDialog).getByRole('button', { name: 'Añadir fotografía' }))

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(
      await screen.findByText('Error al subir las fotografías. Inténtelo de nuevo.'),
    ).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })
})
