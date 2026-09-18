import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { Select, type SelectProps } from './Select'
import { Default } from './Select.stories'

const args = Default.args as SelectProps

describe('Select', () => {
  test('opens labeled options and selects with the pointer', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Select {...args} onChange={onChange} />)
    const trigger = screen.getByRole('combobox', { name: args.label })
    await user.click(trigger)
    expect(screen.getByRole('listbox', { name: args.label })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Producto pendiente' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    await user.click(screen.getByRole('option', { name: 'Producto pendiente' }))
    expect(onChange).not.toHaveBeenCalled()
    await user.click(screen.getByRole('option', { name: /Partículas/ }))
    expect(onChange).toHaveBeenCalledWith('particles')
    expect(trigger).toHaveFocus()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  test('skips disabled options with arrows and supports Home, End, Escape and typing', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Select {...args} onChange={onChange} />)
    await user.tab()
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    expect(onChange).toHaveBeenLastCalledWith('particles')
    await user.keyboard('{Home}{End}{Home}{Enter}')
    expect(onChange).toHaveBeenLastCalledWith('xrays')
    await user.keyboard('par{Enter}')
    expect(onChange).toHaveBeenLastCalledWith('particles')
    await user.keyboard('{ArrowUp}{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveFocus()
  })

  test('closes on Tab or an outside click and cannot open while disabled', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<Select {...args} />)
    await user.click(screen.getByRole('combobox'))
    await user.tab()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    await user.click(screen.getByRole('combobox'))
    await user.click(document.body)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    rerender(<Select {...args} disabled />)
    await user.click(screen.getByRole('combobox'))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
