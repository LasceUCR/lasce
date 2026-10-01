import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { SolarToday, type SolarTodayProps } from './SolarToday'
import { Default, Loading, Empty, SourceError } from './SolarToday.stories'

describe('SolarToday', () => {
  test('identifies today, the source and five solar moments independently of the query form', () => {
    render(<SolarToday {...(Default.args as SolarTodayProps)} />)
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
    render(
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
    render(<SolarToday {...(story.args as SolarTodayProps)} />)
    expect(screen.getByText(message, { exact: false })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '171 Å' })).toBeEnabled()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })
})
