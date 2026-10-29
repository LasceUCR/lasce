import { screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import { NotFoundPage } from './NotFoundPage'

describe('NotFoundPage', () => {
  test('shows the localized not-found title and description in Spanish', () => {
    renderWithIntl(<NotFoundPage />)

    expect(screen.getByRole('heading', { level: 1, name: 'Página no encontrada' })).toBeVisible()
    expect(
      screen.getByText(
        'La dirección ingresada no corresponde a una página disponible. Verifica la dirección o vuelve al inicio.',
      ),
    ).toBeVisible()
  })

  test('links back to the home page', () => {
    renderWithIntl(<NotFoundPage />)

    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/')
  })

  test('shows the not-found page in English when rendered in English', () => {
    renderWithIntl(<NotFoundPage />, { locale: 'en' })

    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
    expect(
      screen.getByText(
        'The address you entered does not match any available page. Check the address or return to the home page.',
      ),
    ).toBeVisible()
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/')
  })
})
