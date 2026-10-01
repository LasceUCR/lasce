import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import {
  InstrumentProductSelect,
  type InstrumentProductSelectProps,
} from './InstrumentProductSelect'
import { Default } from './InstrumentProductSelect.stories'

const groupedArgs = Default.args as InstrumentProductSelectProps

describe('InstrumentProductSelect', () => {
  test('shows only instruments initially and expands products without committing a selection', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<InstrumentProductSelect {...groupedArgs} onChange={onChange} />)
    const trigger = screen.getByRole('combobox', { name: groupedArgs.label })
    await user.click(trigger)
    expect(screen.getByRole('tree', { name: groupedArgs.label })).toBeInTheDocument()
    expect(screen.getAllByRole('treeitem')).toHaveLength(3)
    const exis = screen.getByRole('treeitem', { name: /^EXIS/ })
    await user.click(exis)
    expect(exis).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('treeitem', { name: 'Flujo solar: EUV' })).toBeVisible()
    expect(onChange).not.toHaveBeenCalled()
    await user.click(exis)
    expect(screen.queryByRole('treeitem', { name: 'Flujo solar: EUV' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('treeitem', { name: /^SEISS/ }))
    await user.click(screen.getByRole('treeitem', { name: 'Producto pendiente' }))
    expect(onChange).not.toHaveBeenCalled()
    await user.click(screen.getByRole('treeitem', { name: /Partículas/ }))
    expect(onChange).toHaveBeenCalledWith('particles')
    expect(trigger).toHaveFocus()
    expect(screen.queryByRole('tree')).not.toBeInTheDocument()
    await user.click(trigger)
    expect(screen.getAllByRole('treeitem')).toHaveLength(3)
  })

  test('navigates instrument parents and product children with the keyboard', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<InstrumentProductSelect {...groupedArgs} onChange={onChange} />)
    await user.tab()
    await user.keyboard('{Enter}{ArrowRight}{ArrowRight}{ArrowDown}{Enter}')
    expect(onChange).toHaveBeenLastCalledWith('euv')
    await user.keyboard('{End}{ArrowRight}{ArrowRight}{ArrowLeft}{ArrowLeft}')
    expect(screen.getByRole('treeitem', { name: /^SEISS/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.queryByRole('treeitem', { name: /Partículas/ })).not.toBeInTheDocument()
    await user.keyboard('{Home}{ArrowDown}{Enter}{ArrowDown}{Enter}')
    expect(onChange).toHaveBeenLastCalledWith('magnetic')
    await user.keyboard('se{Enter}{ArrowDown}{Enter}')
    expect(onChange).toHaveBeenLastCalledWith('particles')
    await user.keyboard('{Enter}{Escape}')
    expect(screen.queryByRole('tree')).not.toBeInTheDocument()
  })

  test('dismisses on outside pointer input and hides the tree when disabled', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<InstrumentProductSelect {...groupedArgs} />)
    const trigger = screen.getByRole('combobox')
    await user.click(trigger)
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('tree')).not.toBeInTheDocument()

    await user.click(trigger)
    expect(screen.getByRole('tree')).toBeVisible()
    rerender(<InstrumentProductSelect {...groupedArgs} disabled />)
    expect(screen.queryByRole('tree')).not.toBeInTheDocument()
    await user.click(trigger)
    expect(screen.queryByRole('tree')).not.toBeInTheDocument()
  })
})
