import { render, screen } from '@testing-library/react'
import { ArrowLeft } from 'lucide-react'
import { describe, expect, test } from 'vitest'

import { Button, type ButtonProps } from './Button'
import { External, Primary, Secondary } from './Button.stories'

const primaryArgs = Primary.args as ButtonProps
const secondaryArgs = Secondary.args as ButtonProps

describe('Button', () => {
  test('opens an external resource safely in a new tab', () => {
    const args = External.args as ButtonProps
    render(<Button {...args} />)

    const link = screen.getByRole('link', { name: String(args.children) })
    expect(link).toHaveAttribute('href', args.href)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  test('renders a primary link with the given label', () => {
    render(<Button {...primaryArgs} />)

    expect(screen.getByRole('link', { name: String(primaryArgs.children) })).toHaveAttribute(
      'href',
      primaryArgs.href,
    )
  })

  test('renders a secondary action with a decorative icon', () => {
    render(
      <Button
        href={secondaryArgs.href}
        icon={<ArrowLeft aria-hidden="true" size={18} strokeWidth={1.8} />}
        variant="secondary"
      >
        {secondaryArgs.children}
      </Button>,
    )

    const link = screen.getByRole('link', { name: String(secondaryArgs.children) })

    expect(link).toHaveClass('button-secondary')
    expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  test('renders a native button when no href is given', () => {
    render(<Button variant="secondary">Guardar</Button>)

    expect(screen.getByRole('button', { name: 'Guardar' })).toHaveAttribute('type', 'button')
  })
})
