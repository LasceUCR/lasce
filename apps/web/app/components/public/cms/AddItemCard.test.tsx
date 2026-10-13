import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { AddItemCard, type AddItemCardProps } from './AddItemCard'
import { Closed } from './AddItemCard.stories'

const defaultArgs = Closed.args as AddItemCardProps

describe('AddItemCard', () => {
  test('shows the label as a prompt, with no form open yet', () => {
    render(<AddItemCard {...defaultArgs} />)

    expect(screen.getByRole('button', { name: defaultArgs.label })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.getByRole('button', { name: defaultArgs.label })).toHaveAttribute(
      'aria-haspopup',
      'dialog',
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('opens the given form in a modal when the prompt is pressed', async () => {
    const user = userEvent.setup()
    render(<AddItemCard {...defaultArgs} />)

    await user.click(screen.getByRole('button', { name: defaultArgs.label }))

    expect(screen.getByRole('button', { name: defaultArgs.label })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByRole('dialog', { name: defaultArgs.label })).toBeInTheDocument()
    expect(screen.getByText('Formulario de ejemplo')).toBeInTheDocument()
    // The prompt itself stays put behind the modal.
    expect(screen.getByRole('button', { name: defaultArgs.label })).toBeInTheDocument()
  })

  test('closes the modal when the form calls close()', async () => {
    const user = userEvent.setup()
    render(<AddItemCard {...defaultArgs} />)

    await user.click(screen.getByRole('button', { name: defaultArgs.label }))
    await user.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('closes on Escape straight away without onRequestClose', async () => {
    const user = userEvent.setup()
    render(<AddItemCard {...defaultArgs} />)

    await user.click(screen.getByRole('button', { name: defaultArgs.label }))
    screen.getByRole('dialog').dispatchEvent(new Event('cancel', { cancelable: true }))

    await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  test('leaves closing on Escape to onRequestClose when given', async () => {
    const user = userEvent.setup()
    let requestedClose: (() => void) | null = null
    render(
      <AddItemCard
        {...defaultArgs}
        onRequestClose={(close) => {
          requestedClose = close
        }}
      />,
    )

    await user.click(screen.getByRole('button', { name: defaultArgs.label }))
    act(() => {
      screen.getByRole('dialog').dispatchEvent(new Event('cancel', { cancelable: true }))
    })

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(requestedClose).not.toBeNull()

    act(() => requestedClose?.())

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
