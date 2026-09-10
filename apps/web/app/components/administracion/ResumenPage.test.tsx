import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { ResumenPage } from './ResumenPage'

describe('ResumenPage', () => {
  test('shows the title and the stat cards', () => {
    render(<ResumenPage />)

    expect(screen.getByRole('heading', { level: 1, name: 'Resumen' })).toBeInTheDocument()
    expect(screen.getByText('Investigadores')).toBeInTheDocument()
    expect(screen.getByText('18')).toBeInTheDocument()
  })

  test('flags the panel content as provisional, like other pages', () => {
    render(<ResumenPage />)

    expect(
      screen.getByRole('complementary', { name: 'Información provisional' }),
    ).toBeInTheDocument()
  })

  test('lists the recent activity items', () => {
    render(<ResumenPage />)

    expect(screen.getByText('Nueva publicación agregada')).toBeInTheDocument()
    expect(screen.getByText('Hace 12 min · Administración')).toBeInTheDocument()
  })

  test('shows the services and pipelines panels with their status', () => {
    render(<ResumenPage />)

    expect(screen.getByRole('heading', { level: 2, name: 'Servicios' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Tareas y pipelines' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Operativa')).toHaveLength(3)
    expect(screen.getByText('Programado')).toBeInTheDocument()
  })
})
