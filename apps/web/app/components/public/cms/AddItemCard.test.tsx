import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'

import { AddItemCard, type AddItemCardProps } from './AddItemCard'
import { Closed } from './AddItemCard.stories'

const defaultArgs = Closed.args as AddItemCardProps

describe('AddItemCard', () => {
  test('shows the label as a prompt, with no form open yet', () => {
    render(<AddItemCard {...defaultArgs} />)

    expect(screen.getByRole('button', { name: defaultArgs.label })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('opens the given form in a modal when the prompt is pressed', async () => {
    const user = userEvent.setup()
    render(<AddItemCard {...defaultArgs} />)

    await user.click(screen.getByRole('button', { name: defaultArgs.label }))

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
})
