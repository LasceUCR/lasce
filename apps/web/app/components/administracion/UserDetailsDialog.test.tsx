import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { UserDetailsDialog, type UserDetailsDialogProps } from './UserDetailsDialog'
import { Default, MissingDetails } from './UserDetailsDialog.stories'
import { UsersOverviewPage, type UsersOverviewPageProps } from './UsersOverviewPage'
import { Demo } from './UsersOverviewPage.stories'

// JSDOM does not implement the native dialog lifecycle.
const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = true
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = false
    },
  })
})
afterEach(() => {
  cleanup()
  for (const [name, descriptor] of [
    ['showModal', originalShowModal],
    ['close', originalClose],
  ] as const) {
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, name, descriptor)
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name)
  }
})

describe('UserDetailsDialog', () => {
  test('opens the selected user details and restores focus when closed without losing search', async () => {
    const user = userEvent.setup()
    render(<UsersOverviewPage {...(Demo.args as UsersOverviewPageProps)} />)
    await user.type(screen.getByRole('searchbox'), 'ana@')
    const trigger = screen.getByRole('button', { name: 'Ana Ejemplo' })
    await user.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Información del usuario' })
    for (const value of [
      'Ana Ejemplo',
      'ana@example.com',
      'Universidad de Costa Rica',
      'Costa Rica',
    ]) {
      expect(within(dialog).getByText(value)).toBeInTheDocument()
    }
    expect(within(dialog).queryByText(/contraseña/i)).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(screen.getByRole('searchbox')).toHaveValue('ana@')
    await user.click(trigger)
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: false, cancelable: true }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  test('shows missing institution and country explicitly', () => {
    render(<UserDetailsDialog {...(MissingDetails.args as UserDetailsDialogProps)} />)
    expect(screen.getByText('No registrada')).toBeInTheDocument()
    expect(screen.getByText('No registrado')).toBeInTheDocument()
  })

  test('only renders profile fields even if the source contains additional data', () => {
    const args = Default.args as UserDetailsDialogProps
    const user = { ...args.user, password: 'must-never-be-rendered' }
    render(<UserDetailsDialog {...args} user={user} />)
    expect(screen.queryByText('must-never-be-rendered')).not.toBeInTheDocument()
  })
})
