import { screen, within } from '@testing-library/react'
import { renderWithIntl } from '@/app/lib/i18n/testing'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { SolarToday, type SolarTodayProps } from './SolarToday'
import { Default, Loading, Empty, SourceError } from './SolarToday.stories'

/** The area that holds the placeholders, then the images, the empty state or the error. */
function resultsArea(container: HTMLElement) {
  return container.querySelector<HTMLElement>('#solar-today-results')!
}

describe('SolarToday', () => {
  test('identifies today, the source and five solar moments independently of the query form', () => {
    renderWithIntl(<SolarToday {...(Default.args as SolarTodayProps)} />)
    expect(screen.getByRole('region', { name: 'El Sol de hoy' })).toBeInTheDocument()
    expect(screen.getByText('Fuente: GOES', { exact: false })).toHaveTextContent('SUVI')
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(5)
    expect(screen.getByRole('radio', { name: '195 Å' })).toBeChecked()
    expect(screen.queryByRole('combobox', { name: 'Producto científico' })).not.toBeInTheDocument()
  })
  test('communicates band and range choices and supports refreshing', async () => {
    const user = userEvent.setup()
    const onProductChange = vi.fn()
    const onRangeChange = vi.fn()
    const onRefresh = vi.fn()
    renderWithIntl(
      <SolarToday
        {...(Default.args as SolarTodayProps)}
        onProductChange={onProductChange}
        onRangeChange={onRangeChange}
        onRefresh={onRefresh}
      />,
    )
    await user.click(screen.getByRole('radio', { name: '171 Å' }))
    expect(onProductChange).toHaveBeenCalledWith('Fe171')
    await user.click(screen.getByRole('combobox', { name: 'Rango de hoy (UTC)' }))
    await user.click(screen.getByRole('option', { name: 'Últimas 3 horas' }))
    expect(onRangeChange).toHaveBeenCalledWith('3')
    await user.click(screen.getByRole('button', { name: 'Actualizar imágenes' }))
    expect(onRefresh).toHaveBeenCalledOnce()
  })
  test.each([
    ['loading', Loading, 'Cargando imágenes del Sol de hoy'],
    ['empty', Empty, 'Aún no hay imágenes para esta selección'],
    ['error', SourceError, 'No fue posible cargar las imágenes de GOES'],
  ])('keeps band controls usable in the %s state', (_name, story, message) => {
    renderWithIntl(<SolarToday {...(story.args as SolarTodayProps)} />)
    expect(screen.getByText(message, { exact: false })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '171 Å' })).toBeEnabled()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  test('shows placeholders shaped like the strip while loading, marking the area busy', () => {
    const { container } = renderWithIntl(<SolarToday {...(Loading.args as SolarTodayProps)} />)

    const busy = resultsArea(container)
    expect(busy).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Cargando imágenes del Sol de hoy…')
    // One placeholder per moment of the strip, none of them reachable or announced.
    const placeholders = busy!.querySelector('[inert]')
    expect(placeholders).toHaveAttribute('aria-hidden', 'true')
    expect(placeholders!.querySelectorAll('li')).toHaveLength(5)
    expect(
      screen.queryByRole('region', { name: 'Imágenes del Sol de hoy' }),
    ).not.toBeInTheDocument()
  })

  test('announces the loading state in English on the English site', () => {
    renderWithIntl(<SolarToday {...(Loading.args as SolarTodayProps)} />, { locale: 'en' })

    expect(screen.getByRole('status')).toHaveTextContent("Loading today's solar images…")
  })

  test.each([
    ['the images', Default],
    ['the empty state', Empty],
    ['the error', SourceError],
  ])('is no longer busy once it shows %s', (_name, story) => {
    const { container } = renderWithIntl(<SolarToday {...(story.args as SolarTodayProps)} />)

    expect(resultsArea(container)).not.toHaveAttribute('aria-busy')
    expect(container.querySelector('[inert]')).toBeNull()
  })

  test('replaces the placeholders with the images in the same place', () => {
    const { container, rerender } = renderWithIntl(
      <SolarToday {...(Loading.args as SolarTodayProps)} />,
    )
    const area = resultsArea(container)

    rerender(<SolarToday {...(Default.args as SolarTodayProps)} />)

    expect(resultsArea(container)).toBe(area)
    expect(area).not.toHaveAttribute('aria-busy')
    expect(
      within(area).getByRole('region', { name: 'Imágenes del Sol de hoy' }),
    ).toBeInTheDocument()
    expect(within(area).getAllByRole('listitem')).toHaveLength(5)
  })
})
