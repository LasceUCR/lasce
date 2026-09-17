import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'

import { HeroObservationBadge, type HeroObservationBadgeProps } from './HeroObservationBadge'
import { Loading, Ready, Unavailable } from './HeroObservationBadge.stories'

describe('HeroObservationBadge', () => {
  test('exposes a keyboard-operable "live" trigger with a descriptive accessible name', () => {
    render(<HeroObservationBadge {...(Ready.args as HeroObservationBadgeProps)} />)

    const trigger = screen.getByText('En vivo').closest('summary')
    expect(trigger).toHaveAccessibleName(
      'Imagen del Sol en vivo. Mostrar fecha y fuente de la observación.',
    )
  })

  test('shows a neutral message while the feed is loading', () => {
    render(<HeroObservationBadge {...(Loading.args as HeroObservationBadgeProps)} />)

    expect(screen.getByText(/Actualizando la imagen/)).toBeInTheDocument()
  })

  test('exposes the observation time as real, accessible text once ready', () => {
    render(<HeroObservationBadge {...(Ready.args as HeroObservationBadgeProps)} />)

    const time = screen.getByText('2026-09-15 18:40 UTC')
    expect(time.closest('time')).toHaveAttribute('dateTime', '2026-09-15T18:40:00Z')
  })

  test('does not claim an observation time when the feed is unavailable', () => {
    const { container } = render(
      <HeroObservationBadge {...(Unavailable.args as HeroObservationBadgeProps)} />,
    )

    expect(screen.getByText(/Actualizando la imagen/)).toBeInTheDocument()
    expect(container.querySelector('time')).not.toBeInTheDocument()
  })

  test('closes when its close button is activated', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <HeroObservationBadge {...(Ready.args as HeroObservationBadgeProps)} />,
    )
    const details = container.querySelector('details')

    await user.click(screen.getByText('En vivo'))
    expect(details).toHaveAttribute('open')

    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(details).not.toHaveAttribute('open')
  })

  test('closes when the visitor clicks outside the panel', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <div>
        <HeroObservationBadge {...(Ready.args as HeroObservationBadgeProps)} />
        <button type="button">Fuera</button>
      </div>,
    )
    const details = container.querySelector('details')

    await user.click(screen.getByText('En vivo'))
    expect(details).toHaveAttribute('open')

    await user.click(screen.getByRole('button', { name: 'Fuera' }))
    expect(details).not.toHaveAttribute('open')
  })

  test('closes when Escape is pressed and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <HeroObservationBadge {...(Ready.args as HeroObservationBadgeProps)} />,
    )
    const details = container.querySelector('details')

    await user.click(screen.getByText('En vivo'))
    expect(details).toHaveAttribute('open')

    await user.keyboard('{Escape}')
    expect(details).not.toHaveAttribute('open')
    expect(screen.getByText('En vivo').closest('summary')).toHaveFocus()
  })
})
