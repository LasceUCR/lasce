import { describe, expect, test } from 'vitest'

import {
  DEFAULT_ROLE_PERMISSIONS,
  isPermission,
  isRolePermissionsLocked,
  lockedPermissionsForRole,
  PERMISSIONS,
  sortPermissions,
} from './permissions'

describe('permission catalogue', () => {
  test('recognises only the declared permission identifiers', () => {
    expect(PERMISSIONS.every(isPermission)).toBe(true)
    expect(isPermission('invented')).toBe(false)
  })

  test('assigns component CRUD and downloads to administrators by default', () => {
    expect(DEFAULT_ROLE_PERMISSIONS.ADMIN).toEqual([
      'create_components',
      'edit_components',
      'delete_components',
      'download_resources',
      'manage_users',
      'manage_permissions',
    ])
  })

  test('assigns only component editing and downloads to assistants by default', () => {
    expect(DEFAULT_ROLE_PERMISSIONS.ASSISTANT).toEqual(['edit_components', 'download_resources'])
  })

  test('assigns only downloads to visitors by default', () => {
    expect(DEFAULT_ROLE_PERMISSIONS.VISITOR).toEqual(['download_resources'])
  })

  test('keeps the entire administrator matrix locked', () => {
    expect(isRolePermissionsLocked('ADMIN')).toBe(true)
    expect(isRolePermissionsLocked('ASSISTANT')).toBe(false)
    expect(isRolePermissionsLocked('VISITOR')).toBe(false)
    expect(lockedPermissionsForRole('ADMIN')).toEqual(PERMISSIONS)
    expect(lockedPermissionsForRole('ASSISTANT')).toEqual([])
    expect(lockedPermissionsForRole('VISITOR')).toEqual([])
  })

  test('sorts a permission set into catalogue order', () => {
    expect(sortPermissions(['manage_users', 'create_components'])).toEqual([
      'create_components',
      'manage_users',
    ])
  })
})
