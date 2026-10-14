import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { InstrumentCard, type InstrumentCardProps } from './InstrumentCard'
import {
  PartialInformation,
  Simulation,
  PendingIntegration,
  UnavailableImage,
  WithInformation,
} from './InstrumentCard.stories'

describe('InstrumentCard', () => {
  test('shows mock information with a gallery photo and links the existing simulation', () => {
    const args = Simulation.args as InstrumentCardProps
    render(<InstrumentCard {...args} />)
    expect(screen.getByRole('article', { name: args.instrument.name })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 3, name: args.instrument.name }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/pendiente|por definir/i)).not.toBeInTheDocument()
    expect(screen.getByText(/Los resultados son simulados/)).toBeVisible()
    expect(screen.getByRole('link', { name: args.instrument.consultation!.label })).toHaveAttribute(
      'href',
      args.instrument.consultation!.href,
    )
    expect(screen.queryByText('Cómo citar')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: args.instrument.image!.alt })).toHaveAttribute(
      'src',
      args.instrument.image!.src,
    )
  })

  test('keeps the third instrument pending with its query action disabled', () => {
    const args = PendingIntegration.args as InstrumentCardProps
    render(<InstrumentCard {...args} />)
    expect(screen.getByText(/Información pendiente de confirmación e integración/)).toBeVisible()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    const button = screen.getByRole('button', { name: 'Consultar simulación del ROSAC-HIROS' })
    expect(button).toBeDisabled()
    expect(button).toHaveClass('button', 'button-primary')
    expect(screen.queryByText(/Los resultados son simulados/)).not.toBeInTheDocument()
  })

  test('shows supplied information and citation directly in the card', () => {
    const args = WithInformation.args as InstrumentCardProps
    render(<InstrumentCard {...args} />)
    expect(screen.getByRole('img', { name: args.instrument.image!.alt })).toHaveAttribute(
      'src',
      args.instrument.image!.src,
    )
    expect(screen.getByText(args.instrument.purpose!)).toBeVisible()
    for (const characteristic of args.instrument.characteristics!) {
      expect(screen.getByText(characteristic)).toBeVisible()
    }
    expect(screen.getByText('Cómo citar')).toBeVisible()
    expect(screen.getByText(args.instrument.citation!)).toBeVisible()
    expect(screen.queryByText(/pendiente de confirmación/)).not.toBeInTheDocument()
  })

  test('omits unavailable optional information and keeps partial content visible', () => {
    const args = PartialInformation.args as InstrumentCardProps
    render(<InstrumentCard {...args} />)
    expect(screen.getByText(args.instrument.purpose!)).toBeVisible()
    expect(screen.getByText('Imagen pendiente')).toBeVisible()
    expect(screen.queryByText('Características')).not.toBeInTheDocument()
    expect(screen.queryByText('Cómo citar')).not.toBeInTheDocument()
  })

  test('replaces a failed image without losing information and recovers when its source changes', () => {
    const args = UnavailableImage.args as InstrumentCardProps
    const { rerender } = render(<InstrumentCard {...args} />)
    fireEvent.error(screen.getByRole('img'))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('Imagen no disponible')).toBeVisible()
    expect(screen.getByText(args.instrument.purpose!)).toBeVisible()
    expect(screen.getByText(args.instrument.citation!)).toBeVisible()
    rerender(<InstrumentCard {...(WithInformation.args as InstrumentCardProps)} />)
    expect(screen.getByRole('img')).toBeVisible()
    expect(screen.queryByText('Imagen no disponible')).not.toBeInTheDocument()
  })
})
