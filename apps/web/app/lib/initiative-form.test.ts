import { describe, expect, test } from 'vitest'
import es from '@/messages/es.json'
import en from '@/messages/en.json'
import { Edit, Legacy } from '@/app/components/public/collaborations/InitiativeForm.stories'
import { initiativeDraft, initiativeRequest, validateInitiativeDraft } from './initiative-form'

const record = Edit.args!.initiative!
describe('initiative drafts', () => {
  test('starts empty and preserves each stored language independently', () => {
    expect(initiativeDraft().content).toEqual({
      es: { title: '', description: '' },
      en: { title: '', description: '' },
    })
    expect(initiativeDraft(record).content.en.title).toBe('Test initiative')
    expect(initiativeDraft(Legacy.args!.initiative!).content.en.title).toBe('')
  })
  test('sends only changed shared fields and leaves translations alone on a legacy record', () => {
    const initial = initiativeDraft(record)
    expect(initiativeRequest(record, initial, initial, [])).toBeNull()
    expect(initiativeRequest(record, initial, { ...initial, websiteUrl: '' }, [])).toEqual({
      websiteUrl: '',
      version: record.editing!.version,
    })
    const legacy = Legacy.args!.initiative!
    const draft = { ...initiativeDraft(legacy), logoUrl: '/brand/logo-ISWI.png' }
    expect(validateInitiativeDraft(legacy, draft, [], 'es', es.initiatives.validation)).toEqual({})
  })
  test('requires review in either direction and sends complete translations', () => {
    for (const locale of ['es', 'en'] as const) {
      const initial = initiativeDraft(record)
      const draft = structuredClone(initial)
      draft.content[locale].title += ' updated'
      const other = locale === 'es' ? 'en' : 'es'
      const confirmed = [{ locale: other, field: 'title' }] as const
      expect(
        validateInitiativeDraft(record, draft, [], 'es', es.initiatives.validation),
      ).toHaveProperty(`content.${other}.title`)
      expect(
        validateInitiativeDraft(record, draft, [...confirmed], 'es', es.initiatives.validation),
      ).toEqual({})
      expect(initiativeRequest(record, initial, draft, [...confirmed])).toEqual({
        content: draft.content,
        confirmedUnchanged: confirmed,
        version: record.editing!.version,
      })
    }
  })
  test('reports invalid fields in the UI language and builds a complete create request', () => {
    const draft = { ...initiativeDraft(record), websiteUrl: 'bad' }
    expect(
      validateInitiativeDraft(undefined, draft, [], 'en', en.initiatives.validation).websiteUrl,
    ).toBe(en.initiatives.validation.websiteUrl)
    const body = initiativeRequest(undefined, initiativeDraft(), initiativeDraft(record), [])
    expect(body).toEqual({ content: record.editing!.content, logoUrl: '', websiteUrl: record.href })
  })
})
