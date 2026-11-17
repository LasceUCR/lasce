import { describe, expect, test } from 'vitest'

import { capabilitiesFor, parseSessionCapabilities } from './capabilities'
import type { Permission } from './permissions'

const grants = (...permissions: Permission[]) => new Set<Permission>(permissions)

describe('capabilitiesFor', () => {
  test('offers Administración to assistants and administrators, by the layout rule', () => {
    expect(capabilitiesFor({ fullName: 'Ana', role: 'ADMIN' }, grants()).canAccessAdmin).toBe(true)
    expect(capabilitiesFor({ fullName: 'Ana', role: 'ASSISTANT' }, grants()).canAccessAdmin).toBe(
      true,
    )
    expect(capabilitiesFor({ fullName: 'Ana', role: 'VISITOR' }, grants()).canAccessAdmin).toBe(
      false,
    )
    expect(capabilitiesFor({ fullName: 'Ana', role: null }, grants()).canAccessAdmin).toBe(false)
  })

  test('offers edit mode only when the role holds a content grant right now', () => {
    for (const permission of [
      'create_components',
      'edit_components',
      'delete_components',
    ] as const) {
      expect(
        capabilitiesFor({ fullName: 'Ana', role: 'ASSISTANT' }, grants(permission)).canEdit,
      ).toBe(true)
    }
    // An assistant whose content grants were removed from the matrix: the role alone is not enough.
    expect(
      capabilitiesFor({ fullName: 'Ana', role: 'ASSISTANT' }, grants('download_resources')).canEdit,
    ).toBe(false)
  })

  test('carries the name and role from the session', () => {
    expect(capabilitiesFor({ fullName: 'Ana Pérez', role: 'VISITOR' }, grants())).toEqual({
      name: 'Ana Pérez',
      role: 'VISITOR',
      canAccessAdmin: false,
      canEdit: false,
    })
  })
})

describe('parseSessionCapabilities', () => {
  test('reads a signed-in body', () => {
    expect(
      parseSessionCapabilities({
        signedIn: true,
        name: 'Ana',
        role: 'ADMIN',
        canAccessAdmin: true,
        canEdit: true,
      }),
    ).toEqual({ signedIn: true, name: 'Ana', role: 'ADMIN', canAccessAdmin: true, canEdit: true })
  })

  test('treats anything malformed as signed out, never as privileged', () => {
    for (const body of [null, 'ADMIN', {}, { signedIn: 'true' }, { signedIn: true }, []]) {
      expect(parseSessionCapabilities(body)).toEqual({ signedIn: false })
    }
  })

  test('only an explicit `true` grants a capability', () => {
    expect(
      parseSessionCapabilities({
        signedIn: true,
        name: 'Ana',
        role: 'OWNER',
        canAccessAdmin: 'yes',
        canEdit: 1,
      }),
    ).toEqual({ signedIn: true, name: 'Ana', role: null, canAccessAdmin: false, canEdit: false })
  })
})
