import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { FileDropInput, type FileDropInputProps } from './FileDropInput'
import { Empty, WithExistingImage } from './FileDropInput.stories'

const emptyArgs = Empty.args as FileDropInputProps
const existingArgs = WithExistingImage.args as FileDropInputProps

describe('FileDropInput', () => {
  test('shows the existing image as a preview when one is given', () => {
    render(<FileDropInput {...existingArgs} />)

    expect(screen.getByRole('img')).toHaveAttribute('src', existingArgs.existingImageUrl)
  })

  test('has no preview image and no remove action when nothing is selected yet', () => {
    render(<FileDropInput {...emptyArgs} />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Quitar imagen' })).not.toBeInTheDocument()
  })

  test('clears the selection and calls onFileSelect with null', async () => {
    const user = userEvent.setup()
    const onFileSelect = vi.fn()
    render(<FileDropInput {...existingArgs} onFileSelect={onFileSelect} />)

    await user.click(screen.getByRole('button', { name: 'Quitar imagen' }))

    expect(onFileSelect).toHaveBeenCalledWith(null)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
