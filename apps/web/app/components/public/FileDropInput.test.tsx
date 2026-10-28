import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'
import { FileDropInput, type FileDropInputProps } from './FileDropInput'
import { Empty, WithExistingImage } from './FileDropInput.stories'

const emptyArgs = Empty.args as FileDropInputProps
const existingArgs = WithExistingImage.args as FileDropInputProps

describe('FileDropInput', () => {
  test('shows the existing image as a preview when one is given', () => {
    renderWithIntl(<FileDropInput {...existingArgs} />)

    expect(screen.getByRole('img')).toHaveAttribute('src', existingArgs.existingImageUrl)
    expect(screen.getByRole('img')).toHaveAttribute(
      'alt',
      `Vista previa de ${existingArgs.label.toLowerCase()}`,
    )
  })

  test('has no preview image and no remove action when nothing is selected yet', () => {
    renderWithIntl(<FileDropInput {...emptyArgs} />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Quitar imagen' })).not.toBeInTheDocument()
    expect(
      screen.getByText('Arrastre una imagen aquí o haga clic para seleccionarla del equipo'),
    ).toBeInTheDocument()
  })

  test('renders English copy when rendered under en locale', () => {
    renderWithIntl(<FileDropInput {...existingArgs} />, { locale: 'en' })

    expect(screen.getByRole('button', { name: 'Remove image' })).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveAttribute(
      'alt',
      `Preview of ${existingArgs.label.toLowerCase()}`,
    )
    expect(
      screen.getByText('Drag an image here or click to select from your device'),
    ).toBeInTheDocument()
  })

  test('clears the selection and calls onFileSelect with null', async () => {
    const user = userEvent.setup()
    const onFileSelect = vi.fn()
    renderWithIntl(<FileDropInput {...existingArgs} onFileSelect={onFileSelect} />)

    await user.click(screen.getByRole('button', { name: 'Quitar imagen' }))

    expect(onFileSelect).toHaveBeenCalledWith(null)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  test('refuses a file type the server would reject and keeps the selection unchanged', async () => {
    const user = userEvent.setup({ applyAccept: false })
    const onFileSelect = vi.fn()
    const { container } = renderWithIntl(
      <FileDropInput {...emptyArgs} onFileSelect={onFileSelect} />,
    )

    await user.upload(
      container.querySelector('input[type="file"]') as HTMLInputElement,
      new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }),
    )

    expect(onFileSelect).not.toHaveBeenCalled()
    expect(screen.getByText(/Formato no admitido/)).toBeInTheDocument()
  })

  test('accepts a PNG', async () => {
    const user = userEvent.setup()
    const onFileSelect = vi.fn()
    const { container } = renderWithIntl(
      <FileDropInput {...emptyArgs} onFileSelect={onFileSelect} />,
    )
    const png = new File(['x'], 'a.png', { type: 'image/png' })

    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, png)

    expect(onFileSelect).toHaveBeenCalledWith(png)
  })

  test('names the file input by its label and keeps it out of the tab order', () => {
    renderWithIntl(<FileDropInput {...existingArgs} />)

    const input = document.querySelector('input[type="file"]')
    expect(input).toHaveAccessibleName(existingArgs.label)
    expect(input).toHaveAttribute('tabindex', '-1')
    expect(screen.getByRole('button', { name: existingArgs.label })).toHaveAttribute(
      'tabindex',
      '0',
    )
  })

  test('keeps the remove action outside the drop zone, so the two controls do not nest', () => {
    renderWithIntl(<FileDropInput {...existingArgs} />)

    const zone = screen.getByRole('button', { name: existingArgs.label })
    const remove = screen.getByRole('button', { name: 'Quitar imagen' })
    expect(zone).not.toContainElement(remove)
  })
})
