import { describe, expect, test } from 'vitest'

import {
  adminMenu,
  adminSectionPath,
  adminSections,
  getAdminSection,
  isAdminItemActive,
  visibleAdminMenu,
} from './admin-sections'
import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS, type Permission } from './auth/permissions'

function visibleLabels(granted: readonly Permission[]): string[] {
  return visibleAdminMenu(granted).map((item) => item.label)
}

describe('admin-sections', () => {
  test('builds the path of a section', () => {
    expect(adminSectionPath('usuarios')).toBe('/administracion/usuarios')
  })

  test('resolves a known section and rejects unknown segments', () => {
    expect(getAdminSection('descargas')?.title).toBe('Descargas')
    expect(getAdminSection('resumen')).toBeNull()
    expect(getAdminSection('otra')).toBeNull()
  })

  test('pins the grant each section page enforces', () => {
    const matrix = adminSections.map((section) => [
      section.slug,
      getAdminSection(section.slug)?.permission,
    ])

    expect(matrix).toEqual([
      ['descargas', 'download_resources'],
      ['usuarios', 'manage_users'],
      ['permisos', 'manage_permissions'],
      ['infraestructura', undefined],
    ])
  })

  test('lists Resumen first and then every section in sidebar order', () => {
    expect(adminMenu.map((item) => item.href)).toEqual([
      '/administracion',
      '/administracion/descargas',
      '/administracion/usuarios',
      '/administracion/permisos',
      '/administracion/infraestructura',
    ])
  })

  test('shows only the public sections when no grant is held', () => {
    expect(visibleLabels([])).toEqual(['Resumen', 'Infraestructura'])
  })

  test('adds each section as its grant is held', () => {
    expect(visibleLabels(DEFAULT_ROLE_PERMISSIONS.VISITOR)).toEqual([
      'Resumen',
      'Descargas',
      'Infraestructura',
    ])
    expect(visibleLabels(DEFAULT_ROLE_PERMISSIONS.ASSISTANT)).toEqual([
      'Resumen',
      'Descargas',
      'Infraestructura',
    ])
    expect(visibleLabels(DEFAULT_ROLE_PERMISSIONS.ADMIN)).toEqual([
      'Resumen',
      'Descargas',
      'Usuarios',
      'Permisos',
      'Infraestructura',
    ])
    expect(visibleLabels(PERMISSIONS)).toHaveLength(adminMenu.length)
  })

  test('marks Resumen only on its own path and a section on its subpaths', () => {
    expect(isAdminItemActive('/administracion', '/administracion')).toBe(true)
    expect(isAdminItemActive('/administracion', '/administracion/usuarios')).toBe(false)
    expect(isAdminItemActive('/administracion/usuarios', '/administracion/usuarios')).toBe(true)
    expect(isAdminItemActive('/administracion/usuarios', '/administracion/usuarios/detalle')).toBe(
      true,
    )
    expect(isAdminItemActive('/administracion/usuarios', '/administracion/usuariosx')).toBe(false)
  })
})
