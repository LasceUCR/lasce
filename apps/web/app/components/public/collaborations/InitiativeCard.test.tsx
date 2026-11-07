import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { renderWithIntl } from '@/app/lib/i18n/testing'
import { InitiativeCard } from './InitiativeCard'
import { WithLogo, WithoutOptionalFields } from './InitiativeCard.stories'

describe('InitiativeCard', () => {
  test('keeps a logo and official link associated with their title and uses safe navigation', () => {
    renderWithIntl(<InitiativeCard initiative={WithLogo.args!.initiative!} />)
    expect(screen.getByRole('img')).toHaveAttribute('src', '/brand/logo-ISWI.png')
    expect(screen.getByRole('link')).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByRole('link')).toHaveAttribute('target', '_blank')
    expect(screen.getByRole('heading')).toHaveTextContent('ISWI')
  })
  test('keeps text readable without optional fields or when a logo fails to load', () => {
    const { rerender } = renderWithIntl(<InitiativeCard initiative={WithLogo.args!.initiative!} />)
    fireEvent.error(screen.getByRole('img'))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByRole('heading')).toHaveTextContent('ISWI')
    rerender(<InitiativeCard initiative={WithoutOptionalFields.args!.initiative!} />)
    expect(screen.getByText('Descripción de prueba.')).toBeVisible()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
  test('localizes the website label independently of the stored content language', () => {
    renderWithIntl(
      <InitiativeCard
        initiative={{
          ...WithoutOptionalFields.args!.initiative!,
          contentLocale: null,
          href: 'https://example.com',
        }}
      />,
      { locale: 'en' },
    )
    expect(screen.getByRole('link', { name: 'Official website' })).toBeVisible()
    expect(screen.getByRole('heading').closest('[lang]')).toHaveAttribute('lang', '')
  })
})
