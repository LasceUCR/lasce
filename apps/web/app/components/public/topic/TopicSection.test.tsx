import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { TopicSection } from './TopicSection'

describe('TopicSection', () => {
  test('labels the section with its heading', () => {
    render(
      <TopicSection intro="Introducción de la sección." title="El Sol y el clima espacial" titleId="sw-solar-title">
        <p>Cuerpo</p>
      </TopicSection>,
    )

    const region = screen.getByRole('region', { name: 'El Sol y el clima espacial' })
    const heading = screen.getByRole('heading', { name: 'El Sol y el clima espacial' })

    expect(region).toHaveAttribute('aria-labelledby', 'sw-solar-title')
    expect(heading).toHaveAttribute('id', 'sw-solar-title')
    expect(screen.getByText('Introducción de la sección.')).toBeInTheDocument()
    expect(screen.getByText('Cuerpo')).toBeInTheDocument()
  })

  test('prefixes the heading with an index and can show a badge', () => {
    render(<TopicSection badge="Resumen" index="2" title="Impactos en la Tierra" />)

    expect(screen.getByRole('heading', { name: /2\.\s*Impactos en la Tierra/ })).toBeInTheDocument()
    expect(screen.getByText('Resumen')).toBeInTheDocument()
  })

  test('spans the full layout width when marked wide', () => {
    const { container } = render(<TopicSection title="¿Qué es el clima espacial?" wide />)
    const region = container.querySelector('section')

    expect(region).toHaveClass('topic-section-lede')
    expect(region).toHaveClass('page-width')
  })

  test('wraps featured content and falls back to a generated heading id', () => {
    const { container } = render(
      <TopicSection className="topic-section-end" featured title="El trabajo de LASCE" />,
    )

    const heading = screen.getByRole('heading', { name: 'El trabajo de LASCE' })
    const region = screen.getByRole('region', { name: 'El trabajo de LASCE' })

    expect(heading.id).not.toBe('')
    expect(region).toHaveAttribute('aria-labelledby', heading.id)
    expect(container.querySelector('.topic-highlight')).toBeInTheDocument()
    expect(container.querySelector('section')).toHaveClass('topic-section-end')
  })
})
