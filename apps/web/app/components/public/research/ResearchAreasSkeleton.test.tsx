import { act, screen, within } from '@testing-library/react'
import { Suspense, use } from 'react'
import { describe, expect, test } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import { ResearchAreasSkeleton } from './ResearchAreasSkeleton'
import { Default } from './ResearchAreasSkeleton.stories'

describe('ResearchAreasSkeleton', () => {
  test.each([
    ['es', 'Áreas de investigación', 'Cargando áreas de investigación…'],
    ['en', 'Research areas', 'Loading research areas…'],
  ] as const)(
    'announces loading in %s without exposing decorative cards',
    (locale, title, status) => {
      renderWithIntl(<ResearchAreasSkeleton {...Default.args} />, { locale })

      const region = screen.getByRole('region', { name: title })
      expect(region).toHaveAttribute('aria-busy', 'true')
      expect(within(region).getByRole('status')).toHaveTextContent(status)
      expect(within(region).queryByRole('list')).not.toBeInTheDocument()
      expect(within(region).queryByRole('link')).not.toBeInTheDocument()
      expect(within(region).queryByRole('button')).not.toBeInTheDocument()
    },
  )

  test('keeps static content visible and completely replaces the fallback when data resolves', async () => {
    let resolve!: (value: string) => void
    const pending = new Promise<string>((done) => {
      resolve = done
    })
    function Content() {
      return <h2>{use(pending)}</h2>
    }
    await act(async () => {
      renderWithIntl(
        <>
          <h1>Investigación</h1>
          <a href="/">Volver al inicio</a>
          <Suspense fallback={<ResearchAreasSkeleton />}>
            <Content />
          </Suspense>
        </>,
      )
    })
    expect(screen.getByRole('heading', { name: 'Investigación' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent('Cargando áreas de investigación…')

    await act(async () => {
      resolve('Geomagnetismo')
      await pending
    })

    expect(screen.getByRole('heading', { name: 'Geomagnetismo' })).toBeVisible()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })
})
