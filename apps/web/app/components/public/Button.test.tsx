import { render, screen } from '@testing-library/react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest'

import { Button, type ButtonProps } from './Button'
import {
  Brand,
  Danger,
  ExternalLink as ExternalLinkStory,
  Primary,
  Secondary,
} from './Button.stories'

const primaryArgs = Primary.args as ButtonProps
const secondaryArgs = Secondary.args as ButtonProps
const brandArgs = Brand.args as ButtonProps
const externalLinkArgs = ExternalLinkStory.args as ButtonProps
const dangerArgs = Danger.args as ButtonProps

// Wrap `next/link` in a spy rather than replacing it, so every test still renders
// the real component and only its use becomes observable.
vi.mock('next/link', async (importOriginal) => {
  const actual = await importOriginal<{ default: typeof Link }>()
  const RealLink = actual.default
  return {
    ...actual,
    default: vi.fn((props: ComponentProps<typeof RealLink>) => <RealLink {...props} />),
  }
})

const linkSpy = Link as unknown as Mock

beforeEach(() => {
  linkSpy.mockClear()
})

describe('Button', () => {
  test('renders a primary link through the client router', () => {
    render(<Button {...primaryArgs} />)

    expect(screen.getByRole('link', { name: String(primaryArgs.children) })).toHaveAttribute(
      'href',
      primaryArgs.href,
    )
    expect(linkSpy).toHaveBeenCalled()
  })

  test('renders a plain anchor outside the client router when fullPageLoad is set', () => {
    render(
      <Button fullPageLoad href="/acceso?tab=iniciar-sesion" variant="brand">
        Iniciar sesión
      </Button>,
    )

    const link = screen.getByRole('link', { name: 'Iniciar sesión' })

    expect(link).toHaveAttribute('href', '/acceso?tab=iniciar-sesion')
    expect(link).toHaveClass('button', 'button-brand')
    expect(linkSpy).not.toHaveBeenCalled()
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

  test('renders the brand variant as a solid submit button', () => {
    render(<Button {...brandArgs} />)

    const button = screen.getByRole('button', { name: String(brandArgs.children) })

    expect(button).toHaveClass('button-brand')
    expect(button).toHaveAttribute('type', 'submit')
  })

  test('forwards target and rel to an external link', () => {
    render(<Button {...externalLinkArgs} />)

    const link = screen.getByRole('link', { name: String(externalLinkArgs.children) })

    expect(link).toHaveAttribute('href', externalLinkArgs.href)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  test('renders a destructive action with the danger variant', () => {
    render(<Button {...dangerArgs} />)

    expect(screen.getByRole('button', { name: String(dangerArgs.children) })).toHaveClass(
      'button-danger',
    )
  })
})
