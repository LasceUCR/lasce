import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'

import { NavGroup, isActivePath, type NavGroupProps } from './NavGroup'
import { Closed, Open, WithActiveItem } from './NavGroup.stories'

const closedArgs = Closed.args as NavGroupProps
const openArgs = Open.args as NavGroupProps
const activeArgs = WithActiveItem.args as NavGroupProps

const summary = () => screen.getByText(closedArgs.label)
const details = () => summary().closest('details') as HTMLDetailsElement
const link = (label: string) => screen.getByRole('link', { name: label })

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
})
