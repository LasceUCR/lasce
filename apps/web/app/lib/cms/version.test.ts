import { describe, expect, test } from 'vitest'

import { isCurrentVersion, nextUpdatedAt, parseVersion, toVersion, versionSchema } from './version'

const updatedAt = new Date('2026-09-01T10:00:00.123Z')

describe('version tokens', () => {
  test('are the updated_at in ISO 8601 UTC with milliseconds, and read back exactly', () => {
    expect(toVersion(updatedAt)).toBe('2026-09-01T10:00:00.123Z')
    expect(parseVersion(toVersion(updatedAt)).getTime()).toBe(updatedAt.getTime())
  })

  test('accept an ISO date-time with Z or an offset and reject anything else', () => {
    const schema = versionSchema('La versión es obligatoria.')

    expect(schema.safeParse('2026-09-01T10:00:00.123Z').success).toBe(true)
    expect(schema.safeParse('2026-09-01T04:00:00.123-06:00').success).toBe(true)

    for (const value of ['yesterday', '2026-09-01', '', null, 1, undefined]) {
      const result = schema.safeParse(value)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toBe('La versión es obligatoria.')
    }
  })

  test('an offset version names the same instant as its UTC form', () => {
    expect(isCurrentVersion(updatedAt, parseVersion('2026-09-01T04:00:00.123-06:00'))).toBe(true)
  })
})

describe('isCurrentVersion', () => {
  test('compares to the millisecond', () => {
    expect(isCurrentVersion(updatedAt, new Date(updatedAt.getTime()))).toBe(true)
    expect(isCurrentVersion(updatedAt, new Date(updatedAt.getTime() - 1))).toBe(false)
    expect(isCurrentVersion(updatedAt, new Date(updatedAt.getTime() + 1))).toBe(false)
  })
})

describe('nextUpdatedAt', () => {
  test('is now when now is later than the replaced version', () => {
    const now = updatedAt.getTime() + 5_000

    expect(nextUpdatedAt(updatedAt, now).getTime()).toBe(now)
  })

  test('is still strictly later within the same millisecond or with a clock behind', () => {
    expect(nextUpdatedAt(updatedAt, updatedAt.getTime()).getTime()).toBe(updatedAt.getTime() + 1)
    expect(nextUpdatedAt(updatedAt, updatedAt.getTime() - 60_000).getTime()).toBe(
      updatedAt.getTime() + 1,
    )
  })

  test('makes a stale token stale: the next version never equals the one it replaced', () => {
    let version = updatedAt

    for (let save = 0; save < 5; save++) {
      const next = nextUpdatedAt(version, updatedAt.getTime())
      expect(isCurrentVersion(next, version)).toBe(false)
      expect(next.getTime()).toBeGreaterThan(version.getTime())
      version = next
    }
  })
})
