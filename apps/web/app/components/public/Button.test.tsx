import { render, screen } from '@testing-library/react'
import { ArrowLeft } from 'lucide-react'
import { describe, expect, test } from 'vitest'

import { Button, type ButtonProps } from './Button'
import { Primary, Secondary } from './Button.stories'

const primaryArgs = Primary.args as ButtonProps
const secondaryArgs = Secondary.args as ButtonProps

describe('Button', () => {
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
