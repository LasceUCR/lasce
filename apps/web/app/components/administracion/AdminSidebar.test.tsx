import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'

import { AdminSidebar, type AdminSidebarProps } from './AdminSidebar'
import { Default, MobileOpen } from './AdminSidebar.stories'

const defaultArgs = Default.args as AdminSidebarProps
const openArgs = MobileOpen.args as AdminSidebarProps

const toggle = () => screen.getByRole('button', { name: /Menú/ })
const link = (label: string) => screen.getByRole('link', { name: label })

describe('AdminSidebar', () => {
  test('names the navigation for assistive technology', () => {
    render(<AdminSidebar {...defaultArgs} />)

    expect(screen.getByRole('navigation', { name: 'Panel de administración' })).toBeInTheDocument()
  })

  test('lists every item it was given', () => {
    render(<AdminSidebar {...defaultArgs} />)

    for (const item of defaultArgs.items) {
      expect(link(item.label)).toBeInTheDocument()
    }
  })

  test('marks only the item matching the current path as active', () => {
    render(<AdminSidebar {...defaultArgs} activePathname="/administracion/usuarios" />)

    expect(link('Usuarios')).toHaveAttribute('aria-current', 'page')
    expect(link('Resumen')).not.toHaveAttribute('aria-current')
  })

  test('keeps a nested user path marked as the Usuarios section', () => {
    render(<AdminSidebar {...defaultArgs} activePathname="/administracion/usuarios/detalle" />)

    expect(link('Usuarios')).toHaveAttribute('aria-current', 'page')
    expect(link('Resumen')).not.toHaveAttribute('aria-current')
  })

  test('starts collapsed and names the current section on the toggle', () => {
    render(<AdminSidebar {...defaultArgs} activePathname="/administracion/usuarios" />)

    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
    expect(toggle()).toHaveTextContent('Usuarios')
  })

  test('expands and collapses the list it controls', async () => {
    const user = userEvent.setup()
    render(<AdminSidebar {...defaultArgs} />)

    const list = document.getElementById(toggle().getAttribute('aria-controls') ?? '')
    expect(list).toContainElement(link('Usuarios'))

    await user.click(toggle())
    expect(toggle()).toHaveAttribute('aria-expanded', 'true')

    await user.click(toggle())
    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
  })

  test('starts expanded when asked', () => {
    render(<AdminSidebar {...openArgs} />)

    expect(toggle()).toHaveAttribute('aria-expanded', 'true')
  })

  test('closes on Escape and returns focus to the toggle', async () => {
    const user = userEvent.setup()
    render(<AdminSidebar {...openArgs} />)

    link('Permisos').focus()
    await user.keyboard('{Escape}')

    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
    expect(toggle()).toHaveFocus()
  })

  test('closes on a pointer outside the navigation', () => {
    render(<AdminSidebar {...openArgs} />)

    fireEvent.pointerDown(document.body)

    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
  })

  test('closes when a section is chosen', async () => {
    const user = userEvent.setup()
    render(<AdminSidebar {...openArgs} />)

    // jsdom cannot navigate, so keep the anchor from trying.
    link('Permisos').addEventListener('click', (event) => event.preventDefault())
    await user.click(link('Permisos'))

    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
  })

  test('closes when the pathname changes', () => {
    const { rerender } = render(<AdminSidebar {...openArgs} />)
    expect(toggle()).toHaveAttribute('aria-expanded', 'true')

    rerender(<AdminSidebar {...openArgs} activePathname="/administracion/permisos" />)

    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
  })
})
