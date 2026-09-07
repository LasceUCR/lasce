import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { TopicHero } from './TopicHero'

const hero = {
  kicker: 'Área de trabajo LASCE',
  title: 'Clima espacial',
  lead: 'El clima espacial describe las condiciones del entorno espacial cercanas a la Tierra.',
  image: {
    src: '/images/decorative/Solar-Flare.png',
    alt: 'Fulguración solar en el disco del Sol.',
  },
}

describe('TopicHero', () => {
  test('renders the heading, kicker, lead and image', () => {
    render(<TopicHero {...hero} />)

    expect(screen.getByText(hero.kicker)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: hero.title })).toBeInTheDocument()
    expect(screen.getByText(hero.lead)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: hero.image.alt })).toHaveAttribute('src', hero.image.src)
  })

  test('renders without a lead when none is given', () => {
    render(<TopicHero kicker={hero.kicker} title={hero.title} />)

    expect(screen.getByRole('heading', { level: 1, name: hero.title })).toBeInTheDocument()
    expect(screen.queryByText(hero.lead)).not.toBeInTheDocument()
  })

  test('renders without an image when none is given', () => {
    const { container } = render(
      <TopicHero kicker={hero.kicker} lead={hero.lead} title={hero.title} />,
    )

    expect(container.querySelector('header')).toHaveClass('topic-hero-copy-only')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  test('shows an optional notice under the lead', () => {
    render(<TopicHero {...hero} notice="Contenido sujeto a revisión." />)

    expect(screen.getByText('Contenido sujeto a revisión.')).toBeInTheDocument()
  })
})
