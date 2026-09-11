import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { ConfirmDialog, type ConfirmDialogProps } from './ConfirmDialog'
import { Default } from './ConfirmDialog.stories'

const defaultArgs = Default.args as ConfirmDialogProps

describe('ConfirmDialog', () => {
  test('shows the title and message', () => {
    render(<ConfirmDialog {...defaultArgs} />)

    expect(screen.getByRole('dialog', { name: defaultArgs.title })).toBeInTheDocument()
    expect(screen.getByText(defaultArgs.message)).toBeInTheDocument()
  })

  test('marks a destructive confirm action with the danger variant', () => {
    render(<ConfirmDialog {...defaultArgs} />)

    expect(screen.getByRole('button', { name: 'Confirmar' })).toHaveClass('button-danger')
  })

  test('calls onConfirm when the confirm action is pressed', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<ConfirmDialog {...defaultArgs} onConfirm={onConfirm} />)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  test('calls onCancel when the cancel action is pressed', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<ConfirmDialog {...defaultArgs} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
