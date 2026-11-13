import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { NavigationProgress } from './NavigationProgress'
import meta, { Loading } from './NavigationProgress.stories'

const navigation = vi.hoisted(() => ({ pathname: '/', search: '' }))

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.search),
}))

/**
 * The bar is decorative and hidden from assistive technology, so it has no role or text to find
 * it by. Its state is the one thing it exposes, on `data-state`.
 */
function barState(container: HTMLElement) {
  return container.querySelector('[data-state]')?.getAttribute('data-state')
}

function renderWithLinks() {
  return render(
    <>
      <NavigationProgress {...meta.args} />
      <a href="/nosotros">Nosotros</a>
      <a href="/?page=2">Página 2</a>
      <a href="/">Inicio</a>
      <a href="#areas">Áreas</a>
      <a href="https://www.ucr.ac.cr/">UCR</a>
      <a href="/nosotros" target="_blank">
        Nosotros en otra pestaña
      </a>
      <a download href="/reporte.csv">
        Descargar
      </a>
      <a href="/datos">
        <span>Datos</span>
      </a>
    </>,
  )
}

function navigateTo(pathname: string, search = '') {
  navigation.pathname = pathname
  navigation.search = search
}

// jsdom cannot load another document. Cancelling the click once the bar has seen it (it listens
// in the capture phase) keeps it from trying, as `<Link>` does for a client-side navigation.
function cancelNavigation(event: MouseEvent) {
  event.preventDefault()
}

beforeEach(() => {
  document.addEventListener('click', cancelNavigation)
  vi.useFakeTimers()
  navigateTo('/')
  window.history.replaceState(null, '', '/')
})

afterEach(() => {
  document.removeEventListener('click', cancelNavigation)
  vi.useRealTimers()
})

describe('NavigationProgress', () => {
  test('stays hidden until a link is clicked', () => {
    const { container } = renderWithLinks()

    expect(barState(container)).toBe('idle')
    expect(container.querySelector('[data-state]')).toHaveAttribute('aria-hidden', 'true')
  })

  test('starts the moment a link to another page is clicked', () => {
    const { container, getByText } = renderWithLinks()

    fireEvent.click(getByText('Nosotros'))

    expect(barState(container)).toBe('loading')
  })

  test('starts for a click on an element inside the link', () => {
    const { container, getByText } = renderWithLinks()

    fireEvent.click(getByText('Datos'))

    expect(barState(container)).toBe('loading')
  })

  test('starts for a link that only changes the query, such as pagination', () => {
    const { container, getByText } = renderWithLinks()

    fireEvent.click(getByText('Página 2'))

    expect(barState(container)).toBe('loading')
  })

  test.each([
    ['the current page', 'Inicio', {}],
    ['an anchor on the same page', 'Áreas', {}],
    ['another site', 'UCR', {}],
    ['a link that opens a new tab', 'Nosotros en otra pestaña', {}],
    ['a download', 'Descargar', {}],
    ['a click with Ctrl held', 'Nosotros', { ctrlKey: true }],
    ['a click with Cmd held', 'Nosotros', { metaKey: true }],
    ['a click with Shift held', 'Nosotros', { shiftKey: true }],
    ['a middle click', 'Nosotros', { button: 1 }],
  ])('ignores %s', (_case, label, init) => {
    const { container, getByText } = renderWithLinks()

    fireEvent.click(getByText(label), init)

    expect(barState(container)).toBe('idle')
  })

  test('completes and then hides once the new page is in place', () => {
    const { container, getByText, rerender } = renderWithLinks()

    fireEvent.click(getByText('Nosotros'))
    navigateTo('/nosotros')
    rerender(<NavigationProgress {...meta.args} />)

    expect(barState(container)).toBe('done')

    act(() => vi.advanceTimersByTime(400))

    expect(barState(container)).toBe('idle')
  })

  test('completes when only the query changes', () => {
    const { container, getByText, rerender } = renderWithLinks()

    fireEvent.click(getByText('Página 2'))
    navigateTo('/', 'page=2')
    rerender(<NavigationProgress {...meta.args} />)

    expect(barState(container)).toBe('done')
  })

  test('does not show when the URL changes without a click, such as the back button', () => {
    const { container, rerender } = renderWithLinks()

    navigateTo('/nosotros')
    rerender(<NavigationProgress {...meta.args} />)

    expect(barState(container)).toBe('idle')
  })

  test('a second click restarts the wait instead of finishing early', () => {
    const { container, getByText } = render(
      <>
        <NavigationProgress timeoutMs={8_000} />
        <a href="/nosotros">Nosotros</a>
        <a href="/datos">Datos</a>
      </>,
    )

    fireEvent.click(getByText('Nosotros'))
    act(() => vi.advanceTimersByTime(5_000))
    fireEvent.click(getByText('Datos'))
    act(() => vi.advanceTimersByTime(5_000))

    expect(barState(container)).toBe('loading')
  })

  test('gives up when the navigation never lands', () => {
    const { container, getByText } = render(
      <>
        <NavigationProgress timeoutMs={1_000} />
        <a href="/nosotros">Nosotros</a>
      </>,
    )

    fireEvent.click(getByText('Nosotros'))
    act(() => vi.advanceTimersByTime(1_000))

    expect(barState(container)).toBe('idle')
  })

  test('can start in the loading state, for the story', () => {
    const { container } = render(<NavigationProgress {...meta.args} {...Loading.args} />)

    expect(barState(container)).toBe('loading')
  })
})
