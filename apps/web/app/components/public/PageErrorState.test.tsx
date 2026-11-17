import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import { PageErrorState } from './PageErrorState'

describe('PageErrorState', () => {
  test('says the page could not be loaded, in Spanish by default', () => {
    renderWithIntl(<PageErrorState onRetry={vi.fn()} />)

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se pudo cargar esta página. Inténtelo de nuevo.',
    )
  })

  test('says it in English on the English site', () => {
    renderWithIntl(<PageErrorState onRetry={vi.fn()} />, { locale: 'en' })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'This page could not be loaded. Please try again.',
    )
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  test('retries when the visitor asks to', async () => {
    const onRetry = vi.fn()
    renderWithIntl(<PageErrorState onRetry={onRetry} />)

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(onRetry).toHaveBeenCalledOnce()
  })

  test('offers a way back to the home page', () => {
    renderWithIntl(<PageErrorState onRetry={vi.fn()} />)

    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/')
  })
})
