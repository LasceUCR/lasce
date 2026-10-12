import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  uploadConstructionStageImage: vi.fn(),
}))

vi.mock('@/app/(public)/radioastronomia/actions', () => ({
  uploadConstructionStageImage: mocks.uploadConstructionStageImage,
}))

URL.createObjectURL = vi.fn(() => 'blob:mock-url')
URL.revokeObjectURL = vi.fn()

import { RosacStageForm, type RosacStageFormProps } from './RosacStageForm'

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
    expect(
      screen.getByRole('textbox', { name: 'Texto alternativo de la fotografía 1' }),
    ).toHaveValue(sampleImages[0].alt)
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

  test('allows editing alt text of an existing photo', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<RosacStageForm {...defaultArgs} onSave={onSave} />)

    const altInput = screen.getByRole('textbox', { name: 'Texto alternativo de la fotografía 1' })
    await user.clear(altInput)
    await user.type(altInput, 'Nueva descripción accesible')

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

  test('allows removing a photo when more than one photo exists', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<RosacStageForm {...defaultArgs} onSave={onSave} />)

    const deleteButton = screen.getByRole('button', { name: 'Eliminar fotografía 1' })
    await user.click(deleteButton)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        images: [sampleImages[1]],
      }),
    )
  })

  test('allows adding a new photo with custom alt text', async () => {
    const user = userEvent.setup()
    mocks.uploadConstructionStageImage.mockResolvedValueOnce({
      ok: true,
      imageUrl: '/images/uploaded.jpg',
    })
    const onSave = vi.fn()
    render(<RosacStageForm {...defaultArgs} onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Añadir fotografía' }))

    const file = new File(['fake-image'], 'foto.jpg', { type: 'image/jpeg' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, file)

    const newAltInput = screen.getByRole('textbox', {
      name: 'Texto alternativo accesible (alt)',
    })
    await user.type(newAltInput, 'Foto de la nueva grúa')

    await user.click(screen.getByRole('button', { name: 'Guardar foto en la etapa' }))

    expect(screen.getByText('Fotografías de la etapa (3)')).toBeInTheDocument()

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
})
