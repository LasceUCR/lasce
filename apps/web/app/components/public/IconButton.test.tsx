import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { IconButton, type IconButtonProps } from './IconButton'
import { Delete, Edit } from './IconButton.stories'

const defaultArgs = Edit.args as IconButtonProps
const dangerArgs = Delete.args as IconButtonProps

describe('IconButton', () => {
  test('exposes its label as the accessible name', () => {
    render(<IconButton {...defaultArgs} />)

    expect(screen.getByRole('button', { name: defaultArgs.label })).toBeInTheDocument()
  })

  test('calls onClick when pressed', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<IconButton {...defaultArgs} onClick={onClick} />)

    await user.click(screen.getByRole('button', { name: defaultArgs.label }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  test('does not call onClick while disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<IconButton {...defaultArgs} disabled onClick={onClick} />)

    await user.click(screen.getByRole('button', { name: defaultArgs.label }))

    expect(onClick).not.toHaveBeenCalled()
  })

  test('marks a destructive action with the danger variant class', () => {
    render(<IconButton {...dangerArgs} />)

    expect(screen.getByRole('button', { name: dangerArgs.label })).toHaveClass('icon-button-danger')
  })
})
