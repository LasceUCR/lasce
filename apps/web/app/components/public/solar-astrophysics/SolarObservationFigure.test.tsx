import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { solarAstrophysicsContent } from '@/app/lib/solar-astrophysics'

import { SolarObservationFigure } from './SolarObservationFigure'
import { useLatestSuviObservation } from './useLatestSuviObservation'

vi.mock('./useLatestSuviObservation', () => ({
  useLatestSuviObservation: vi.fn(),
}))

const observationCopy = solarAstrophysicsContent.observation

describe('SolarObservationFigure', () => {
  test('shows the latest SUVI frame, its observation time, and source', () => {
    vi.mocked(useLatestSuviObservation).mockReturnValue({
      status: 'ready',
      src: 'https://services.swpc.noaa.gov/images/animations/suvi/primary/195/latest.png',
      observedAtIso: '2026-09-15T18:44:00Z',
      observedAtLabel: '2026-09-15 18:44 UTC',
    })

    render(<SolarObservationFigure content={observationCopy} />)

    expect(screen.getByRole('img', { name: observationCopy.alt })).toHaveAttribute(
      'src',
      'https://services.swpc.noaa.gov/images/animations/suvi/primary/195/latest.png',
    )
    expect(screen.getByText('2026-09-15 18:44 UTC').closest('time')).toHaveAttribute(
      'dateTime',
      '2026-09-15T18:44:00Z',
    )
    expect(screen.getByText(observationCopy.source)).toBeInTheDocument()
    expect(screen.getByRole('complementary')).toContainElement(
      screen.getByText('2026-09-15 18:44 UTC'),
    )
  })

  test('shows an accessible fallback when the feed is unavailable', () => {
    vi.mocked(useLatestSuviObservation).mockReturnValue({ status: 'unavailable' })

    render(<SolarObservationFigure content={observationCopy} />)

    expect(screen.getByRole('status')).toHaveTextContent(observationCopy.unavailable)
    expect(screen.getByText(observationCopy.source)).toBeInTheDocument()
    expect(screen.getByRole('complementary')).toContainElement(
      screen.getByText(observationCopy.source),
    )
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(document.querySelector('time')).not.toBeInTheDocument()
  })

  test('shows a loading state before the latest frame is ready', () => {
    vi.mocked(useLatestSuviObservation).mockReturnValue({ status: 'loading' })

    render(<SolarObservationFigure content={observationCopy} />)

    expect(screen.getByRole('status')).toHaveTextContent(observationCopy.loading)
  })

  test('falls back if the loaded image cannot be displayed', () => {
    vi.mocked(useLatestSuviObservation).mockReturnValue({
      status: 'ready',
      src: 'https://services.swpc.noaa.gov/images/animations/suvi/primary/195/latest.png',
      observedAtIso: '2026-09-15T18:44:00Z',
      observedAtLabel: '2026-09-15 18:44 UTC',
    })

    render(<SolarObservationFigure content={observationCopy} />)
    fireEvent.error(screen.getByRole('img', { name: observationCopy.alt }))

    expect(screen.getByRole('status')).toHaveTextContent(observationCopy.unavailable)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByText('2026-09-15 18:44 UTC')).not.toBeInTheDocument()
  })
})
