import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { ToolsPage } from './ToolsPage'

describe('ToolsPage', () => {
  test('introduces the SWAAT tool with its description', () => {
    render(<ToolsPage />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Herramientas científicas' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'SWAAT' })).toBeInTheDocument()
    expect(screen.getByText(/Análisis automatizado de eventos solares/)).toBeInTheDocument()
    expect(screen.queryByText('Contenido en preparación')).not.toBeInTheDocument()
  })

  test('links to the external SWAPRO service safely in a new tab', () => {
    render(<ToolsPage />)

    const link = screen.getByRole('link', { name: /Acceder a SWAPRO/ })
    expect(link).toHaveAttribute('href', 'https://swaat.up.railway.app')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
