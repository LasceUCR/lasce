import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { NavGroup, isActivePath, type NavGroupProps } from './NavGroup'
import { Closed, Open, WithActiveItem } from './NavGroup.stories'

const closedArgs = Closed.args as NavGroupProps
const openArgs = Open.args as NavGroupProps
const activeArgs = WithActiveItem.args as NavGroupProps

const summary = () => screen.getByText(closedArgs.label)
const details = () => summary().closest('details') as HTMLDetailsElement
const link = (label: string) => screen.getByRole('link', { name: label })
const group = (label: string) => screen.getByText(label).closest('details') as HTMLDetailsElement

describe('isActivePath', () => {
  test('matches the page and its descendants only', () => {
    expect(isActivePath('/datos', '/datos')).toBe(true)
    expect(isActivePath('/datos/serie', '/datos')).toBe(true)
    expect(isActivePath('/datos-abiertos', '/datos')).toBe(false)
    expect(isActivePath('/', '/datos')).toBe(false)
  })
})

describe('NavGroup', () => {
  test('shows the links only once the summary opens it', async () => {
    const user = userEvent.setup()
    render(<NavGroup {...closedArgs} />)

    expect(details()).not.toHaveAttribute('open')
    for (const item of closedArgs.items) {
      expect(link(item.label)).not.toBeVisible()
    }

    await user.click(summary())

    expect(details()).toHaveAttribute('open')
    for (const item of closedArgs.items) {
      expect(link(item.label)).toBeVisible()
      expect(link(item.label)).toHaveAttribute('href', item.href)
    }
  })

  test('starts open when asked and marks the current page', () => {
    render(<NavGroup {...activeArgs} />)

    expect(details()).toHaveAttribute('open')
    expect(link('Galería')).toHaveAttribute('aria-current', 'page')
    expect(link('Publicaciones')).not.toHaveAttribute('aria-current')
  })

  test('closes when a link is chosen', async () => {
    const user = userEvent.setup()
    render(<NavGroup {...openArgs} />)

    // jsdom cannot navigate, so keep the anchor from trying.
    link('Galería').addEventListener('click', (event) => event.preventDefault())
    await user.click(link('Galería'))

    expect(details()).not.toHaveAttribute('open')
  })

  test('closes on Escape and returns focus to the summary', async () => {
    const user = userEvent.setup()
    render(<NavGroup {...openArgs} />)

    link('Galería').focus()
    await user.keyboard('{Escape}')

    expect(details()).not.toHaveAttribute('open')
    expect(summary()).toHaveFocus()
  })

  test('closes on a pointer outside the group', () => {
    render(<NavGroup {...openArgs} />)

    fireEvent.pointerDown(document.body)

    expect(details()).not.toHaveAttribute('open')
  })

  test('closes when focus leaves the group', async () => {
    const user = userEvent.setup()
    render(
      <>
        <NavGroup {...openArgs} />
        <a href="/noticias">Noticias</a>
      </>,
    )

    link('Galería').focus()
    await user.tab()

    expect(link('Noticias')).toHaveFocus()
    expect(details()).not.toHaveAttribute('open')
  })

  test('opens on hover without a click, and closes a short grace period after the pointer leaves', () => {
    vi.useFakeTimers()
    render(<NavGroup {...closedArgs} />)

    expect(details()).not.toHaveAttribute('open')

    fireEvent.mouseEnter(details())
    expect(details()).toHaveAttribute('open')

    fireEvent.mouseLeave(details())
    // Not immediate: a path from the trigger into the panel that briefly
    // crosses neither box (a diagonal, or the account panel's extra width)
    // must not cut the dropdown.
    expect(details()).toHaveAttribute('open')

    vi.advanceTimersByTime(120)
    expect(details()).not.toHaveAttribute('open')

    vi.useRealTimers()
  })

  test('does not close if the pointer re-enters during the grace period', () => {
    vi.useFakeTimers()
    render(<NavGroup {...closedArgs} />)

    fireEvent.mouseEnter(details())
    fireEvent.mouseLeave(details())
    vi.advanceTimersByTime(60)
    fireEvent.mouseEnter(details())
    // Past when the original close would have fired, had it not been cancelled.
    vi.advanceTimersByTime(120)

    expect(details()).toHaveAttribute('open')

    vi.useRealTimers()
  })

  test('opening another group closes the previous one without waiting for its grace period', () => {
    vi.useFakeTimers()
    render(
      <>
        <NavGroup {...closedArgs} label="Investigación" />
        <NavGroup {...closedArgs} label="Divulgación" />
      </>,
    )

    fireEvent.mouseEnter(group('Investigación'))
    fireEvent.mouseLeave(group('Investigación'))
    // Still inside the first group's grace period.
    vi.advanceTimersByTime(30)
    fireEvent.mouseEnter(group('Divulgación'))

    expect(group('Investigación')).not.toHaveAttribute('open')
    expect(group('Divulgación')).toHaveAttribute('open')

    // The first group's cancelled timer does not close the second one.
    vi.advanceTimersByTime(120)
    expect(group('Divulgación')).toHaveAttribute('open')

    vi.useRealTimers()
  })

  test('opening another group with a click closes the previous one', () => {
    render(
      <>
        <NavGroup {...closedArgs} label="Investigación" />
        <NavGroup {...closedArgs} label="Divulgación" />
      </>,
    )

    // Opened by hover, so no focus moves and no blur can be what closes it below.
    fireEvent.mouseEnter(group('Investigación'))
    expect(group('Investigación')).toHaveAttribute('open')

    // A browser activates a focused summary on Enter or Space with this same click event.
    fireEvent.click(screen.getByText('Divulgación'))

    expect(group('Investigación')).not.toHaveAttribute('open')
    expect(group('Divulgación')).toHaveAttribute('open')
  })
})
