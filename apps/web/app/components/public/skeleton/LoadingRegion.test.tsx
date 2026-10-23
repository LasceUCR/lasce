import { screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import { LoadingRegion, type LoadingRegionProps } from './LoadingRegion'
import meta, { CustomLabel, Loaded } from './LoadingRegion.stories'

const args = meta.args as LoadingRegionProps

/** The region, found through what it announces rather than its markup. */
function region() {
  return screen.getByRole('status').parentElement as HTMLElement
}

describe('LoadingRegion', () => {
  test('marks the area busy and announces that it is loading, in Spanish by default', () => {
    renderWithIntl(<LoadingRegion {...args} />)

    expect(region()).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Cargando…')
    expect(screen.queryByText('Contenido cargado.')).not.toBeInTheDocument()
  })

  test('announces it in English on the English site', () => {
    renderWithIntl(<LoadingRegion {...args} />, { locale: 'en' })

    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
  })

  test('announces the label it is given', () => {
    renderWithIntl(<LoadingRegion {...args} {...CustomLabel.args} />)

    expect(screen.getByRole('status')).toHaveTextContent('Cargando imágenes solares…')
  })

  test('keeps the placeholders out of assistive technology and out of the tab order', () => {
    renderWithIntl(
      <LoadingRegion {...args} skeleton={<button type="button">No debería enfocarse</button>} />,
    )

    const placeholders = screen.getByText('No debería enfocarse').parentElement
    expect(placeholders).toHaveAttribute('aria-hidden', 'true')
    expect(placeholders).toHaveAttribute('inert')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  test('shows what loaded, and is no longer busy', () => {
    renderWithIntl(<LoadingRegion {...args} {...Loaded.args} />)

    expect(screen.getByText('Contenido cargado.')).toBeInTheDocument()
    expect(region()).not.toHaveAttribute('aria-busy')
    expect(screen.getByRole('status')).toHaveTextContent('')
  })

  test('replaces the placeholders once loading finishes, keeping the status region mounted', () => {
    const { rerender } = renderWithIntl(<LoadingRegion {...args} />)
    const status = screen.getByRole('status')

    rerender(<LoadingRegion {...args} loading={false} />)

    expect(screen.getByRole('status')).toBe(status)
    expect(region()).not.toHaveAttribute('aria-busy')
    expect(screen.getByText('Contenido cargado.')).toBeInTheDocument()
    expect(document.querySelector('[inert]')).toBeNull()
  })

  test('stays busy without announcing when something else announces the load', () => {
    const { container } = renderWithIntl(<LoadingRegion {...args} announce={false} />)

    expect(container.firstElementChild).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
