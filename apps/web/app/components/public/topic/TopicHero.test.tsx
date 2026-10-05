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

  test('places a transparent mark on the page without the photograph frame', () => {
    render(
      <TopicHero
        kicker={hero.kicker}
        title={hero.title}
        image={{
          src: '/images/ROSAC/logo/ROSAC-YELLOW.png',
          alt: 'Logo del Radio Observatorio de Santa Cruz (ROSAC)',
          presentation: 'mark',
          width: 1209,
          height: 615,
        }}
      />,
    )

    const mark = screen.getByRole('img', {
      name: 'Logo del Radio Observatorio de Santa Cruz (ROSAC)',
    })
    expect(mark).toHaveAttribute('src', '/images/ROSAC/logo/ROSAC-YELLOW.png')
  })

  test('shows a banner whole, without a separate mark, keeping its focus side in view', () => {
    const { container } = render(
      <TopicHero
        kicker={hero.kicker}
        title="Radio Observatorio de Santa Cruz (ROSAC)"
        image={{
          src: '/images/ROSAC/rosac_home.jpg',
          alt: 'Antena de ROSAC con el logo de ROSAC.',
          presentation: 'banner',
          width: 1672,
          height: 749,
          focus: 'left',
        }}
      />,
    )

    expect(screen.getAllByRole('img')).toHaveLength(1)
    const banner = screen.getByRole('img', { name: 'Antena de ROSAC con el logo de ROSAC.' })
    expect(banner).toHaveAttribute('src', '/images/ROSAC/rosac_home.jpg')
    expect(container.querySelector('header')).toHaveClass('topic-hero-with-mark')
    expect(container.querySelector('.topic-hero-banner')).toBeInTheDocument()
    expect(container.querySelector('.topic-hero-mark-footer')).toBeNull()
  })

  test('adds a mobile version of the banner that replaces it on narrow screens', () => {
    const { container } = render(
      <TopicHero
        kicker={hero.kicker}
        title="Radio Observatorio de Santa Cruz (ROSAC)"
        image={{
          src: '/images/ROSAC/rosac_home.jpg',
          alt: 'Antena de ROSAC con el logo de ROSAC.',
          presentation: 'banner',
          width: 1672,
          height: 749,
          focus: 'left',
          mobileSrc: '/images/ROSAC/rosac_home_mob.png',
        }}
      />,
    )

    expect(container.querySelector('.topic-hero-banner')).toHaveClass(
      'topic-hero-banner-has-mobile',
    )
    expect(container.querySelector('.topic-hero-banner-main')).toHaveAttribute(
      'src',
      '/images/ROSAC/rosac_home.jpg',
    )
    expect(container.querySelector('.topic-hero-banner-mobile')).toHaveAttribute(
      'src',
      '/images/ROSAC/rosac_home_mob.png',
    )
  })

  test('shows an optional notice under the lead', () => {
    render(<TopicHero {...hero} notice="Contenido sujeto a revisión." />)

    expect(screen.getByText('Contenido sujeto a revisión.')).toBeInTheDocument()
  })
})
