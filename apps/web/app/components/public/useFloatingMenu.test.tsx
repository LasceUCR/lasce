import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { useFloatingMenu } from './useFloatingMenu'

interface FloatingPanelProps {
  bounded?: boolean
  onDismiss?: () => void
}

function FloatingPanel({ bounded, onDismiss }: FloatingPanelProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const dismiss = useCallback(() => {
    onDismiss?.()
    setOpen(false)
  }, [onDismiss])
  const { position, placeMenu } = useFloatingMenu({
    open,
    triggerRef,
    menuRef,
    onDismiss: dismiss,
    boundarySelector: bounded ? '[data-floating-boundary]' : undefined,
  })

  return (
    <section aria-label="Panel boundary" data-floating-boundary>
      <button
        ref={triggerRef}
        onClick={() => {
          if (!open) placeMenu()
          setOpen(!open)
        }}
      >
        <span>Toggle panel</span>
      </button>
      {open &&
        createPortal(
          <div ref={menuRef} role="dialog" aria-label="Floating panel" style={position}>
            <button>Inside panel</button>
          </div>,
          document.body,
        )}
    </section>
  )
}

function renderPanel(props: FloatingPanelProps = {}) {
  const result = render(<FloatingPanel {...props} />)
  const trigger = screen.getByRole('button', { name: 'Toggle panel' })
  const measure = vi
    .spyOn(trigger, 'getBoundingClientRect')
    .mockReturnValue(new DOMRect(100, 100, 240, 40))
  return { ...result, trigger, measure, user: userEvent.setup() }
}

function stubVisualViewport() {
  const viewport = Object.assign(new EventTarget(), {
    offsetTop: 0,
    offsetLeft: 0,
    width: 800,
    height: 600,
  })
  vi.stubGlobal('visualViewport', viewport)
  return viewport
}

beforeEach(() => {
  vi.stubGlobal('innerWidth', 800)
  vi.stubGlobal('innerHeight', 600)
  vi.stubGlobal('visualViewport', undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('useFloatingMenu', () => {
  test('opens below the trigger with its width when there is room', async () => {
    const { trigger, user } = renderPanel()
    await user.click(trigger)

    expect(screen.getByRole('dialog')).toHaveStyle({
      position: 'fixed',
      top: '146px',
      left: '100px',
      width: '240px',
      maxHeight: '320px',
    })
  })

  test('opens upwards near the bottom and stays inside the right viewport edge', async () => {
    const { trigger, measure, user } = renderPanel()
    measure.mockReturnValue(new DOMRect(700, 520, 240, 40))
    await user.click(trigger)

    expect(screen.getByRole('dialog')).toHaveStyle({
      bottom: '86px',
      left: '548px',
      width: '240px',
      maxHeight: '320px',
    })
  })

  test('shrinks a wide panel to fit a narrow viewport', async () => {
    vi.stubGlobal('innerWidth', 200)
    const { trigger, user } = renderPanel()
    await user.click(trigger)

    expect(screen.getByRole('dialog')).toHaveStyle({ left: '12px', width: '176px' })
  })

  test('limits placement and available height to the supplied ancestor boundary', async () => {
    const { trigger, measure, user } = renderPanel({ bounded: true })
    vi.spyOn(
      screen.getByRole('region', { name: 'Panel boundary' }),
      'getBoundingClientRect',
    ).mockReturnValue(new DOMRect(100, 80, 500, 240))
    measure.mockReturnValue(new DOMRect(500, 220, 240, 40))
    await user.click(trigger)

    expect(screen.getByRole('dialog')).toHaveStyle({
      left: '352px',
      bottom: '386px',
      width: '240px',
      maxHeight: '126px',
    })
  })

  test('respects the offset and size of the visual viewport', async () => {
    const viewport = stubVisualViewport()
    Object.assign(viewport, { offsetTop: 200, offsetLeft: 100, width: 300, height: 260 })
    const { trigger, measure, user } = renderPanel()
    measure.mockReturnValue(new DOMRect(80, 250, 400, 40))
    await user.click(trigger)

    expect(screen.getByRole('dialog')).toHaveStyle({
      top: '296px',
      left: '112px',
      width: '276px',
      maxHeight: '152px',
    })
  })

  test.each(['window resize', 'ancestor scroll', 'viewport resize', 'viewport scroll'])(
    'follows the trigger after %s',
    async (event) => {
      const viewport = stubVisualViewport()
      const { trigger, measure, user } = renderPanel()
      await user.click(trigger)
      measure.mockReturnValue(new DOMRect(150, 120, 240, 40))

      act(() => {
        if (event === 'window resize') window.dispatchEvent(new Event('resize'))
        else if (event === 'ancestor scroll')
          screen.getByRole('region', { name: 'Panel boundary' }).dispatchEvent(new Event('scroll'))
        else viewport.dispatchEvent(new Event(event === 'viewport resize' ? 'resize' : 'scroll'))
      })

      expect(screen.getByRole('dialog')).toHaveStyle({ top: '166px', left: '150px' })
    },
  )

  test('ignores pointer input and scrolling inside the trigger or portalled panel', async () => {
    const onDismiss = vi.fn()
    const { trigger, measure, user } = renderPanel({ onDismiss })
    await user.click(trigger)
    measure.mockClear()

    fireEvent.pointerDown(screen.getByText('Toggle panel'))
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Inside panel' }))
    fireEvent.scroll(screen.getByRole('button', { name: 'Inside panel' }))
    expect(screen.getByRole('dialog')).toBeVisible()
    expect(onDismiss).not.toHaveBeenCalled()
    expect(measure).not.toHaveBeenCalled()

    fireEvent.pointerDown(document.body)
    expect(onDismiss).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('removes dismissal and reposition listeners on close and unmount', async () => {
    const viewport = stubVisualViewport()
    const onDismiss = vi.fn()
    const { trigger, measure, user, unmount } = renderPanel({ onDismiss })

    function dispatchOutsideEvents() {
      act(() => {
        document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
        document.dispatchEvent(new Event('scroll'))
        window.dispatchEvent(new Event('resize'))
        viewport.dispatchEvent(new Event('resize'))
        viewport.dispatchEvent(new Event('scroll'))
      })
    }

    await user.click(trigger)
    await user.click(trigger)
    measure.mockClear()
    dispatchOutsideEvents()
    expect(measure).not.toHaveBeenCalled()
    expect(onDismiss).not.toHaveBeenCalled()

    await user.click(trigger)
    unmount()
    measure.mockClear()
    dispatchOutsideEvents()
    expect(measure).not.toHaveBeenCalled()
    expect(onDismiss).not.toHaveBeenCalled()
  })
})
