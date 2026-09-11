import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { Toggle, type ToggleProps } from './Toggle'
import { Off } from './Toggle.stories'

const defaultArgs = Off.args as ToggleProps

describe('Toggle', () => {
  test('exposes its state and label through the switch role', () => {
    render(<Toggle {...defaultArgs} />)

    const switchControl = screen.getByRole('switch', { name: defaultArgs.label })
    expect(switchControl).toHaveAttribute('aria-checked', 'false')
  })

  test('reflects checked through aria-checked', () => {
    render(<Toggle {...defaultArgs} checked />)

    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  test('calls onChange with the flipped value when clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Toggle {...defaultArgs} onChange={onChange} />)

    await user.click(screen.getByRole('switch'))

    expect(onChange).toHaveBeenCalledWith(true)
  })

  test('does not respond to clicks while disabled', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Toggle {...defaultArgs} disabled onChange={onChange} />)

    await user.click(screen.getByRole('switch'))

    expect(onChange).not.toHaveBeenCalled()
  })
})
