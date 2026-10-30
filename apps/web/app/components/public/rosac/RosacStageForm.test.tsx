import type { ReactElement } from 'react'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  uploadConstructionStageImage: vi.fn(),
}))

vi.mock('@/app/(public)/radioastronomia/actions', () => ({
  uploadConstructionStageImage: mocks.uploadConstructionStageImage,
}))

import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import { renderWithIntl } from '@/app/lib/i18n/testing'
import { RosacStageForm, type RosacStageFormProps } from './RosacStageForm'

function render(ui: ReactElement, options?: Parameters<typeof renderWithIntl>[1]) {
  return renderWithIntl(<ToastProvider>{ui}</ToastProvider>, options)
}

URL.createObjectURL = vi.fn(() => 'blob:mock-url')
URL.revokeObjectURL = vi.fn()

const sampleImages = [
  {
    src: '/images/ROSAC/construction/Preparacion/Preparacion_1.jpg',
    alt: 'Montaje de piezas preliminares del radiotelescopio.',
  },
  {
    src: '/images/ROSAC/construction/Preparacion/Preparacion_2.jpg',
    alt: 'Camión con grúa y componentes metálicos junto al sitio de la antena.',
  },
] as const

const defaultArgs: RosacStageFormProps = {
  stage: {
    id: 'stage-1',
    navigationLabel: 'Preparación',
    title: 'Preparación para el montaje',
    description:
      'Antes del montaje principal se realizaron trabajos de preparación del sitio y de los componentes que posteriormente formarían parte de la estructura.',
    images: sampleImages,
    editing: {
      content: {
        es: {
          title: 'Preparación para el montaje',
          description:
            'Antes del montaje principal se realizaron trabajos de preparación del sitio y de los componentes que posteriormente formarían parte de la estructura.',
        },
        en: {
          title: 'Preparation for assembly',
          description:
            'Prior to the main assembly, site preparation and component works were carried out.',
        },
      },
      isLegacy: false,
      version: '1',
    },
  },
  onCancel: vi.fn(),
  onSave: vi.fn(),
}

function renderForm(props: Partial<RosacStageFormProps> = {}, locale: 'es' | 'en' = 'es') {
  const onSave = vi.fn()
  const onCancel = vi.fn()
  render(<RosacStageForm {...defaultArgs} onCancel={onCancel} onSave={onSave} {...props} />, {
    locale,
  })
  return { onSave, onCancel, user: userEvent.setup() }
}

describe('RosacStageForm', () => {
  test('starts pre-filled with the stage being edited', () => {
    renderForm()

    expect(screen.getByRole('textbox', { name: 'Título (Español)' })).toHaveValue(
      defaultArgs.stage.title,
    )
    expect(screen.getByRole('textbox', { name: 'Descripción (Español)' })).toHaveValue(
      defaultArgs.stage.description,
    )
    expect(screen.getByRole('button', { name: 'Editar fotografías (2)' })).toBeInTheDocument()
  })

  test('calls onCancel directly when untouched', async () => {
    const { onCancel, user } = renderForm()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test('prompts to discard changes when modified and cancelled', async () => {
    const { onCancel, user } = renderForm()

    const titleInput = screen.getByRole('textbox', { name: 'Título (Español)' })
    await user.clear(titleInput)
    await user.type(titleInput, 'Nuevo Título')

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    const discardDialog = screen.getByRole('dialog', { name: '¿Descartar cambios?' })
    expect(discardDialog).toBeInTheDocument()

    await user.click(within(discardDialog).getByRole('button', { name: 'Descartar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test('shows validation errors when title is cleared on submit', async () => {
    const { onSave, user } = renderForm()

    const titleInput = screen.getByRole('textbox', { name: 'Título (Español)' })
    await user.clear(titleInput)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.getByText('El título en español es obligatorio.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('calls onSave directly when submitted with both languages updated', async () => {
    const { onSave, user } = renderForm()

    const titleInput = screen.getByRole('textbox', { name: 'Título (Español)' })
    await user.clear(titleInput)
    await user.type(titleInput, 'Etapa Modificada')

    await user.click(screen.getByRole('tab', { name: /^English/ }))
    const enTitleInput = screen.getByRole('textbox', { name: 'Título (English)' })
    await user.clear(enTitleInput)
    await user.type(enTitleInput, 'Modified Stage')

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onSave).toHaveBeenCalledWith({
      version: '1',
      content: {
        es: {
          title: 'Etapa Modificada',
          description: defaultArgs.stage.description,
        },
        en: {
          title: 'Modified Stage',
          description: defaultArgs.stage.editing?.content.en?.description ?? '',
        },
      },
      confirmedUnchanged: [],
    })
  })

  test('asks to review the other language when only one language changed', async () => {
    const { onSave, user } = renderForm()

    const titleInput = screen.getByRole('textbox', { name: 'Título (Español)' })
    await user.clear(titleInput)
    await user.type(titleInput, 'Etapa Modificada')

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('tab', { name: /^English/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('switch')).not.toBeChecked()

    await user.click(screen.getByRole('switch'))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith({
      version: '1',
      content: {
        es: {
          title: 'Etapa Modificada',
          description: defaultArgs.stage.description,
        },
        en: {
          title: defaultArgs.stage.editing?.content.en?.title ?? '',
          description: defaultArgs.stage.editing?.content.en?.description ?? '',
        },
      },
      confirmedUnchanged: [{ locale: 'en', field: 'title' }],
    })
  })

  test('allows deleting a photo via the edit photos modal with confirmation', async () => {
    const { onSave, user } = renderForm()

    await user.click(screen.getByRole('button', { name: /^Editar fotografías/ }))

    const editDialog = screen.getByRole('dialog', { name: 'Editar fotografías' })
    expect(editDialog).toBeInTheDocument()

    const deleteButton = within(editDialog).getByRole('button', {
      name: 'Eliminar fotografía 1',
    })
    await user.click(deleteButton)

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
    const { user } = renderForm()

    await user.click(screen.getByRole('button', { name: /^Editar fotografías/ }))

    const editDialog = screen.getByRole('dialog', { name: 'Editar fotografías' })
    const deleteButton = within(editDialog).getByRole('button', {
      name: 'Eliminar fotografía 1',
    })
    await user.click(deleteButton)

    const deleteConfirmDialog = screen.getByRole('dialog', { name: 'Eliminar fotografía' })
    expect(deleteConfirmDialog).toBeInTheDocument()

    await user.click(within(deleteConfirmDialog).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog', { name: 'Eliminar fotografía' })).not.toBeInTheDocument()

    expect(
      within(editDialog).getByRole('textbox', { name: 'Texto alternativo de la fotografía 1' }),
    ).toBeInTheDocument()
  })

  test('allows adding a new photo with custom alt text via the add photo modal', async () => {
    mocks.uploadConstructionStageImage.mockResolvedValueOnce({
      ok: true,
      imageUrl: '/images/uploaded.jpg',
    })
    const { onSave, user } = renderForm()

    await user.click(screen.getByRole('button', { name: 'Añadir fotografía' }))

    const addDialog = screen.getByRole('dialog', { name: 'Añadir fotografía' })
    expect(addDialog).toBeInTheDocument()

    const fileInput = addDialog.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['dummy'], 'photo.jpg', { type: 'image/jpeg' })
    await user.upload(fileInput, file)

    const altInput = within(addDialog).getByRole('textbox', {
      name: 'Texto alternativo accesible (alt)',
    })
    await user.type(altInput, 'Nueva fotografía de prueba')

    await user.click(within(addDialog).getByRole('button', { name: 'Añadir fotografía' }))
    expect(screen.queryByRole('dialog', { name: 'Añadir fotografía' })).not.toBeInTheDocument()

    expect(screen.getByRole('button', { name: 'Editar fotografías (3)' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(mocks.uploadConstructionStageImage).toHaveBeenCalled()
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        images: [
          ...sampleImages,
          {
            src: '/images/uploaded.jpg',
            alt: 'Nueva fotografía de prueba',
          },
        ],
      }),
    )
  })

  test('shows the error in a toast and does not save when a photo upload fails', async () => {
    mocks.uploadConstructionStageImage.mockResolvedValueOnce({
      ok: false,
      error: 'La imagen es demasiado grande.',
    })
    const { onSave, user } = renderForm()

    await user.click(screen.getByRole('button', { name: 'Añadir fotografía' }))
    const addDialog = screen.getByRole('dialog', { name: 'Añadir fotografía' })
    const fileInput = addDialog.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['dummy'], 'large.jpg', { type: 'image/jpeg' }))
    await user.click(within(addDialog).getByRole('button', { name: 'Añadir fotografía' }))

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.getByText('La imagen es demasiado grande.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('shows a toast when a photo upload throws', async () => {
    mocks.uploadConstructionStageImage.mockRejectedValueOnce(new Error('network error'))
    const { onSave, user } = renderForm()

    await user.click(screen.getByRole('button', { name: 'Añadir fotografía' }))
    const addDialog = screen.getByRole('dialog', { name: 'Añadir fotografía' })
    const fileInput = addDialog.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['dummy'], 'throw.jpg', { type: 'image/jpeg' }))
    await user.click(within(addDialog).getByRole('button', { name: 'Añadir fotografía' }))

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(
      screen.getByText('Error al subir las fotografías. Inténtelo de nuevo.'),
    ).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })
})
