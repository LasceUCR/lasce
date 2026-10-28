import { createTranslator } from 'next-intl'
import { describe, expect, test } from 'vitest'

import en from '@/messages/en.json'
import es from '@/messages/es.json'

import { permissionRows, permissionText, roleName } from './access-messages'
import { ROLE_LABELS } from './auth/account'
import {
  PERMISSION_DENIED,
  PERMISSION_DESCRIPTIONS,
  PERMISSION_LABELS,
  PERMISSIONS,
} from './auth/permissions'

/** Every role, from a record TypeScript keeps exhaustive over `UserRole`. */
const ROLES = Object.keys(ROLE_LABELS) as (keyof typeof ROLE_LABELS)[]

interface MessageTree {
  [key: string]: string | MessageTree
}

function entries(tree: MessageTree, prefix = ''): [string, string][] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string' ? [[`${prefix}${key}`, value]] : entries(value, `${prefix}${key}.`),
  )
}

describe('the access catalogue', () => {
  test('names exactly the roles and permissions the platform has', () => {
    for (const catalogue of [es, en]) {
      expect(Object.keys(catalogue.access.roles).sort()).toEqual([...ROLES].sort())
      expect(Object.keys(catalogue.access.permissions).sort()).toEqual([...PERMISSIONS].sort())
    }
  })

  test.each([
    ['access', es.access, en.access],
    ['administration.permissions', es.administration.permissions, en.administration.permissions],
  ])('translates every %s message into English, none of them blank', (_name, source, english) => {
    const spanish = entries(source)
    const translated = new Map(entries(english))

    expect(spanish.filter(([, text]) => text.trim() === '')).toEqual([])
    expect(spanish.map(([path]) => path).filter((path) => !translated.get(path)?.trim())).toEqual(
      [],
    )
  })

  test('keeps the Spanish text of the constants the other screens still use', () => {
    for (const role of ROLES) expect(es.access.roles[role]).toBe(ROLE_LABELS[role])
    for (const permission of PERMISSIONS) {
      expect(es.access.permissions[permission]).toEqual({
        label: PERMISSION_LABELS[permission],
        description: PERMISSION_DESCRIPTIONS[permission],
        denied: PERMISSION_DENIED[permission],
      })
    }
  })
})

describe('roleName', () => {
  test('names each role in the language of the catalogue', () => {
    expect(roleName('VISITOR', es)).toBe('Visitante')
    expect(roleName('ADMIN', es)).toBe('Persona administradora')
    expect(roleName('ASSISTANT', en)).toBe('Assistant')
    expect(roleName('ADMIN', en)).toBe('Administrator')
  })

  test('has an English name of its own for every role', () => {
    for (const role of ROLES) expect(roleName(role, en)).not.toBe(roleName(role, es))
  })

  test('uses Spanish when no catalogue is given', () => {
    expect(roleName('ASSISTANT')).toBe('Asistente')
  })

  test('falls back to Spanish for a missing or blank name', () => {
    expect(roleName('VISITOR', {})).toBe('Visitante')
    expect(roleName('VISITOR', { access: { roles: { VISITOR: '  ' } } })).toBe('Visitante')
  })
})

describe('permissionText', () => {
  test('gives the label, description and access-denied message in Spanish', () => {
    expect(permissionText('manage_permissions', es)).toEqual({
      label: 'Configurar permisos',
      description: 'Ver y cambiar los permisos asociados a cada rol.',
      denied: 'No tienes autorización para configurar los permisos de los roles.',
    })
  })

  test('gives them in English', () => {
    expect(permissionText('download_goes_resources', en)).toEqual({
      label: 'Download GOES resources',
      description: 'Download data from the GOES satellites.',
      denied: 'You are not authorized to download GOES resources.',
    })
  })

  test('has English text of its own for every permission', () => {
    for (const permission of PERMISSIONS) {
      const spanish = permissionText(permission, es)
      const english = permissionText(permission, en)

      expect(english.label, permission).not.toBe(spanish.label)
      expect(english.description, permission).not.toBe(spanish.description)
      expect(english.denied, permission).not.toBe(spanish.denied)
    }
  })

  test('falls back to Spanish field by field', () => {
    expect(
      permissionText('manage_users', {
        access: { permissions: { manage_users: { label: 'Manage users', description: '' } } },
      }),
    ).toEqual({
      label: 'Manage users',
      description: 'Consultar cuentas y asignar o retirar roles.',
      denied: 'No tienes autorización para administrar usuarios.',
    })
  })
})

describe('permissionRows', () => {
  test('lists every permission in catalogue order, with its text', () => {
    const rows = permissionRows(en)

    expect(rows.map((row) => row.id)).toEqual([...PERMISSIONS])
    expect(rows[0]).toEqual({ id: 'create_components', ...permissionText('create_components', en) })
  })
})

describe('the permissions page messages', () => {
  const translators = {
    es: createTranslator({ locale: 'es', messages: es, namespace: 'administration.permissions' }),
    en: createTranslator({ locale: 'en', messages: en, namespace: 'administration.permissions' }),
  }

  test('count pending changes with each language plural rules', () => {
    expect(translators.es('pending', { count: 1 })).toBe('1 cambio sin guardar')
    expect(translators.es('pending', { count: 3 })).toBe('3 cambios sin guardar')
    expect(translators.en('pending', { count: 1 })).toBe('1 unsaved change')
    expect(translators.en('pending', { count: 3 })).toBe('3 unsaved changes')
  })

  test('name a checkbox after its permission and its role', () => {
    const values = { permission: 'Configure permissions', role: 'Administrator' }

    expect(translators.en('checkbox', values)).toBe('Configure permissions: Administrator')
    expect(translators.en('checkboxLocked', values)).toBe(
      'Configure permissions: Administrator (cannot be changed)',
    )
  })
})
