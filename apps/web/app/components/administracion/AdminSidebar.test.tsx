import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { AdminSidebar, type AdminSidebarProps } from './AdminSidebar'
import { Default } from './AdminSidebar.stories'

const defaultArgs = Default.args as AdminSidebarProps

describe('AdminSidebar', () => {
  test('names the navigation for assistive technology', () => {
    render(<AdminSidebar {...defaultArgs} />)

    expect(screen.getByRole('navigation', { name: 'Panel de administración' })).toBeInTheDocument()
  })

  test('lists every item it was given', () => {
    render(<AdminSidebar {...defaultArgs} />)

    for (const item of defaultArgs.items) {
      expect(screen.getByRole('link', { name: item.label })).toBeInTheDocument()
    }
  })

  test('marks only the item matching the current path as active', () => {
    render(<AdminSidebar {...defaultArgs} activePathname="/administracion/usuarios" />)

    expect(screen.getByRole('link', { name: 'Usuarios' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Resumen' })).not.toHaveAttribute('aria-current')
  })
})
