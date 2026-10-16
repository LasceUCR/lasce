import { fireEvent, screen } from '@testing-library/react'
import { renderWithIntl } from '@/app/lib/i18n/testing'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import {
  InstrumentProductSelect,
  type InstrumentProductSelectProps,
} from './InstrumentProductSelect'
import { Default, LargeGroups } from './InstrumentProductSelect.stories'

const groupedArgs = Default.args as InstrumentProductSelectProps

describe('InstrumentProductSelect', () => {
  test('shows only instruments initially and expands products without committing a selection', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithIntl(<InstrumentProductSelect {...groupedArgs} onChange={onChange} />)
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
    renderWithIntl(<InstrumentProductSelect {...groupedArgs} onChange={onChange} />)
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
    const { rerender } = renderWithIntl(<InstrumentProductSelect {...groupedArgs} />)
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

  test('scrolls the menu along with a long group while it expands', async () => {
    const frames = new Map<number, FrameRequestCallback>()
    let nextFrame = 0
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.set(++nextFrame, callback)
      return nextFrame
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((frame) => frames.delete(frame))
    const runFrames = () => {
      const pending = [...frames]
      frames.clear()
      pending.forEach(([, callback]) => callback(0))
    }
    const user = userEvent.setup()
    renderWithIntl(
      <InstrumentProductSelect {...(LargeGroups.args as InstrumentProductSelectProps)} />,
    )
    await user.click(screen.getByRole('combobox'))

    // jsdom has no layout: place SEISS below the fold and let its height grow by hand.
    const menu = screen.getByRole('tree')
    const seiss = screen.getByRole('treeitem', { name: /^SEISS/ })
    let scrollTop = 0
    let height = 44
    Object.defineProperties(menu, {
      clientHeight: { value: 320 },
      scrollTop: { get: () => scrollTop, set: (value: number) => (scrollTop = value) },
    })
    Object.defineProperties(seiss, {
      offsetTop: { value: 100 },
      offsetHeight: { get: () => height },
    })
    Object.defineProperties(seiss.firstElementChild!, {
      offsetTop: { value: 100 },
      offsetHeight: { value: 44 },
    })

    await user.click(seiss)
    expect(scrollTop).toBe(0)
    height = 300
    runFrames()
    expect(scrollTop).toBe(80)
    height = 500
    runFrames()
    expect(scrollTop).toBe(100)

    fireEvent.transitionEnd(seiss.lastElementChild!, { propertyName: 'grid-template-rows' })
    expect(frames.size).toBe(0)
    vi.restoreAllMocks()
  })
})
