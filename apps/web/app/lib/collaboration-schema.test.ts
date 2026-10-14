import { describe, expect, test } from 'vitest'
import { collaborationCreateSchema, collaborationUpdateSchema } from './collaboration-schema'

const body = {
  name: ' Institute ',
  scope: 'international',
  content: { es: { country: 'Italia' }, en: { country: 'Italy' } },
}
const version = '2026-10-14T12:00:00.000Z'

describe('collaboration input', () => {
  test('trims required fields and allows omission of every optional field', () => {
    expect(collaborationCreateSchema.parse(body)).toEqual({
      ...body,
      name: 'Institute',
      acronym: null,
      websiteUrl: null,
    })
  })
  test.each([
    { name: ' ' },
    { scope: '' },
    { scope: 'National' },
    { content: { es: { country: 'Italia' } } },
    { content: { es: { country: ' ' }, en: { country: 'Italy' } } },
    { websiteUrl: 'javascript:alert(1)' },
    { websiteUrl: 'not a url' },
    { websiteUrl: 'https://example.com:invalid' },
    { websiteUrl: 'https://user:password@example.com' },
    { name: 'a'.repeat(301) },
    { acronym: 'a'.repeat(101) },
    { extra: true },
  ])('rejects invalid input %j', (change) => {
    expect(collaborationCreateSchema.safeParse({ ...body, ...change }).success).toBe(false)
  })
  test('allows HTTP(S) links and explicitly clears optional values', () => {
    expect(
      collaborationCreateSchema.parse({
        ...body,
        websiteUrl: 'https://example.com',
      }),
    ).toMatchObject({ websiteUrl: 'https://example.com' })
    expect(
      collaborationUpdateSchema.parse({ version, websiteUrl: null, acronym: '  ' }),
    ).toEqual({ version, websiteUrl: null, acronym: null })
  })
  test('preserves omitted fields in shared-only edits and requires a version and a change', () => {
    expect(collaborationUpdateSchema.parse({ version, name: 'New name' })).toEqual({
      version,
      name: 'New name',
    })
    expect(collaborationUpdateSchema.safeParse({ version }).success).toBe(false)
    expect(collaborationUpdateSchema.safeParse({ name: 'New name' }).success).toBe(false)
    expect(
      collaborationUpdateSchema.safeParse({ version, name: 'New name', confirmedUnchanged: [] })
        .success,
    ).toBe(false)
  })
})
