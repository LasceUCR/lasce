import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test } from 'vitest'

import { accessTabsCopy } from '@/app/lib/auth/login'

import { AccessTabs, type AccessTabsProps } from './AccessTabs'
import { Login, Register } from './AccessTabs.stories'

const loginArgs = Login.args as AccessTabsProps
const registerArgs = Register.args as AccessTabsProps

const tab = (name: string) => screen.getByRole('tab', { name })

afterEach(() => {
  window.history.replaceState(null, '', '/acceso')
})

describe('AccessTabs', () => {
  test('opens the requested tab and hides the other card', () => {
    render(<AccessTabs {...registerArgs} />)

    expect(screen.getByRole('tablist', { name: accessTabsCopy.label })).toBeInTheDocument()
    expect(tab(accessTabsCopy.tabs.register)).toHaveAttribute('aria-selected', 'true')
    expect(tab(accessTabsCopy.tabs.login)).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByText('Tarjeta de registro')).toBeVisible()
    expect(screen.getByText('Tarjeta de inicio de sesión')).not.toBeVisible()
  })

  test('labels each panel with its tab', () => {
    render(<AccessTabs {...loginArgs} />)

    const panel = screen.getByRole('tabpanel', { name: accessTabsCopy.tabs.login })
    expect(panel).toContainElement(screen.getByText('Tarjeta de inicio de sesión'))
    expect(tab(accessTabsCopy.tabs.login)).toHaveAttribute('aria-controls', panel.id)
  })

  test('switches on click and writes the choice to the query string', async () => {
    const user = userEvent.setup()
    render(<AccessTabs {...loginArgs} />)

    await user.click(tab(accessTabsCopy.tabs.register))

    expect(tab(accessTabsCopy.tabs.register)).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Tarjeta de registro')).toBeVisible()
    expect(screen.getByText('Tarjeta de inicio de sesión')).not.toBeVisible()
    expect(window.location.search).toBe('?tab=crear-cuenta')
  })

  test('moves between tabs with the arrow keys, Home and End', async () => {
    const user = userEvent.setup()
    render(<AccessTabs {...loginArgs} />)

    tab(accessTabsCopy.tabs.login).focus()
    await user.keyboard('{ArrowRight}')
    expect(tab(accessTabsCopy.tabs.register)).toHaveFocus()
    expect(tab(accessTabsCopy.tabs.register)).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{ArrowRight}')
    expect(tab(accessTabsCopy.tabs.login)).toHaveFocus()

    await user.keyboard('{End}')
    expect(tab(accessTabsCopy.tabs.register)).toHaveFocus()

    await user.keyboard('{Home}')
    expect(tab(accessTabsCopy.tabs.login)).toHaveFocus()
    expect(window.location.search).toBe('?tab=iniciar-sesion')
  })

  test('keeps the unselected tab out of the Tab order', () => {
    render(<AccessTabs {...loginArgs} />)

    expect(tab(accessTabsCopy.tabs.login)).toHaveAttribute('tabindex', '0')
    expect(tab(accessTabsCopy.tabs.register)).toHaveAttribute('tabindex', '-1')
  })
})
