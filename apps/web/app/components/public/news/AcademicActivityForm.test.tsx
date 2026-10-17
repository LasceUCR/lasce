import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  uploadAcademicActivityImage: vi.fn(),
}))

vi.mock('@/app/(public)/actividades-academicas/actions', () => ({
  uploadAcademicActivityImage: mocks.uploadAcademicActivityImage,
}))

import type { AcademicActivity } from '@/app/lib/academic-activities'

import { AcademicActivityForm } from './AcademicActivityForm'

const existingActivity: AcademicActivity = {
  id: '00000000-0000-4000-8000-000000000001',
  title: 'Taller de prueba',
  category: 'Taller',
  date: '16-20 febrero, 2026',
  startDate: '2026-02-16',
  endDate: '2026-02-20',
  location: 'San José, Costa Rica',
  description: 'Descripción de prueba.',
  photoUrl: 'https://s3.example/lasce/taller.png',
  photoAlt: 'Texto alternativo de prueba',
}

URL.createObjectURL = vi.fn(() => 'blob:mock-url')
URL.revokeObjectURL = vi.fn()

describe('AcademicActivityForm', () => {
  test('starts blank for a new activity', () => {
    render(<AcademicActivityForm activity={null} onCancel={() => {}} onSave={() => {}} />)

    expect(screen.getByRole('textbox', { name: 'Título' })).toHaveValue('')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  test('starts pre-filled with the activity being edited', () => {
    render(
      <AcademicActivityForm activity={existingActivity} onCancel={() => {}} onSave={() => {}} />,
    )

    expect(screen.getByRole('textbox', { name: 'Título' })).toHaveValue(existingActivity.title)
    expect(screen.getByRole('textbox', { name: 'Categoría' })).toHaveValue(
      existingActivity.category,
    )
    expect(screen.getByRole('textbox', { name: 'Ubicación' })).toHaveValue(
      existingActivity.location,
    )
    expect(screen.getByRole('textbox', { name: 'Descripción' })).toHaveValue(
      existingActivity.description,
    )
    expect(screen.getByRole('img')).toHaveAttribute('src', existingActivity.photoUrl)
  })

  test('calls onCancel directly, without asking for confirmation, on a blank form', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()

    render(<AcademicActivityForm activity={null} onCancel={onCancel} onSave={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('shows every missing required field and does not save an incomplete activity', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()

    render(<AcademicActivityForm activity={null} onCancel={() => {}} onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.getByText('El título es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('La categoría es obligatoria.')).toBeInTheDocument()
    expect(screen.getByText('La fecha de inicio es obligatoria.')).toBeInTheDocument()
    expect(screen.getByText('La ubicación es obligatoria.')).toBeInTheDocument()
    expect(screen.getByText('La descripción es obligatoria.')).toBeInTheDocument()
    expect(screen.getByText('La imagen es obligatoria.')).toBeInTheDocument()
    expect(
      screen.getByText('El texto alternativo de la imagen es obligatorio.'),
    ).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('saves edited values while keeping the existing image', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()

    render(<AcademicActivityForm activity={existingActivity} onCancel={() => {}} onSave={onSave} />)

    await user.clear(screen.getByRole('textbox', { name: 'Título' }))
    await user.type(screen.getByRole('textbox', { name: 'Título' }), 'Taller actualizado')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith({
      title: 'Taller actualizado',
      category: existingActivity.category,
      startDate: existingActivity.startDate,
      endDate: existingActivity.endDate,
      location: existingActivity.location,
      description: existingActivity.description,
      photoUrl: existingActivity.photoUrl,
      photoAlt: existingActivity.photoAlt,
    })
  })

  test('sends a null endDate when it is left blank', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()

    render(
      <AcademicActivityForm
        activity={{ ...existingActivity, endDate: null }}
        onCancel={() => {}}
        onSave={onSave}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ endDate: null }))
  })

  test('uploads a selected image and saves with the returned public URL', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()
    mocks.uploadAcademicActivityImage.mockResolvedValue({
      ok: true,
      imageUrl: 'https://s3.example/lasce/nueva.png',
    })

    render(<AcademicActivityForm activity={existingActivity} onCancel={() => {}} onSave={onSave} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['imagen'], 'nueva.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(mocks.uploadAcademicActivityImage).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ photoUrl: 'https://s3.example/lasce/nueva.png' }),
    )
  })

  test('shows the upload error and does not save when the upload is rejected', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()
    mocks.uploadAcademicActivityImage.mockResolvedValue({
      ok: false,
      error: 'La imagen es demasiado grande.',
    })

    render(<AcademicActivityForm activity={existingActivity} onCancel={() => {}} onSave={onSave} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['imagen'], 'nueva.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('La imagen es demasiado grande.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('asks before discarding unsaved changes and closes once confirmed', async () => {
    const onCancel = vi.fn()
    const user = userEvent.setup()

    render(
      <AcademicActivityForm activity={existingActivity} onCancel={onCancel} onSave={() => {}} />,
    )

    await user.type(screen.getByRole('textbox', { name: 'Título' }), ' editado')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    const dialog = screen.getByRole('dialog', { name: 'Descartar cambios no guardados' })
    expect(onCancel).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: 'Descartar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
