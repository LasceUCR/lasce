import { describe, expect, test } from 'vitest'

import {
  CONTACT_CHANNEL_DESCRIPTION_MAX,
  contactCardLink,
  contactChannelCreateSchema,
  isSinglePhoneNumber,
  isVisibleContactCard,
  storedHref,
} from './contact-channel-schema'

const content = {
  es: { title: 'Teléfono', description: '2511-6566' },
  en: { title: 'Phone', description: '2511-6566' },
}

describe('contact channel schema', () => {
  test('keeps an https link only for Instagram and Facebook', () => {
    const url = 'https://www.facebook.com/lasce'

    expect(storedHref('facebook', url)).toBe(url)
    expect(storedHref('instagram', url)).toBe(url)
    expect(storedHref('phone', url)).toBeNull()
    expect(storedHref('email', url)).toBeNull()
    expect(storedHref('location', null)).toBeNull()
  })

  test('derives a phone or email link from the description', () => {
    expect(contactCardLink('phone', '2511-6566', null)).toEqual({
      href: 'tel:+50625116566',
      external: false,
    })
    expect(contactCardLink('phone', '+506 2511-6566', null)).toEqual({
      href: 'tel:+50625116566',
      external: false,
    })
    expect(contactCardLink('phone', '2511-6566, 2222-3333', null)).toBeNull()
    expect(contactCardLink('email', 'lasce@ucr.ac.cr', null)).toEqual({
      href: 'mailto:lasce@ucr.ac.cr',
      external: false,
    })
    expect(contactCardLink('facebook', '@lasce', 'https://www.facebook.com/lasce')).toEqual({
      href: 'https://www.facebook.com/lasce',
      external: true,
    })
    expect(contactCardLink('instagram', '@lasce_ucr', null)).toBeNull()
    expect(contactCardLink('location', 'CIGEFI', null)).toBeNull()
  })

  test('rejects a social link that is not https and ignores one on other icons', () => {
    expect(
      contactChannelCreateSchema.safeParse({
        icon: 'facebook',
        href: 'http://facebook.com/lasce',
        content,
      }).success,
    ).toBe(false)
    expect(
      contactChannelCreateSchema.safeParse({
        icon: 'phone',
        href: 'https://example.com',
        content,
      }).success,
    ).toBe(true)
    expect(
      contactChannelCreateSchema.safeParse({ icon: 'instagram', href: '  ', content }).success,
    ).toBe(true)
  })

  test('accepts one phone number and rejects a second or other text', () => {
    expect(isSinglePhoneNumber('2511-6566')).toBe(true)
    expect(isSinglePhoneNumber('+506 2511-6566')).toBe(true)
    expect(isSinglePhoneNumber('2511-6566, 2222-3333')).toBe(false)
    expect(isSinglePhoneNumber('2511-6566 y 2222-3333')).toBe(false)

    expect(
      contactChannelCreateSchema.safeParse({ icon: 'phone', href: null, content }).success,
    ).toBe(true)
    expect(
      contactChannelCreateSchema.safeParse({
        icon: 'phone',
        href: null,
        content: {
          es: { title: 'Teléfono', description: '2511-6566 / 2222-3333' },
          en: { title: 'Phone', description: '2511-6566 / 2222-3333' },
        },
      }).success,
    ).toBe(false)
    expect(
      contactChannelCreateSchema.safeParse({
        icon: 'email',
        href: null,
        content: {
          es: { title: 'Correo', description: 'Dos números: 2511-6566 y 2222-3333' },
          en: { title: 'Email', description: 'Two numbers: 2511-6566 and 2222-3333' },
        },
      }).success,
    ).toBe(true)
    expect(
      contactChannelCreateSchema.safeParse({ icon: 'location', href: null, content }).success,
    ).toBe(false)
  })

  test('rejects a description longer than a card can show', () => {
    const description = 'a'.repeat(CONTACT_CHANNEL_DESCRIPTION_MAX + 1)
    expect(
      contactChannelCreateSchema.safeParse({
        icon: 'email',
        href: null,
        content: {
          es: { title: 'Lugar', description },
          en: { title: 'Place', description },
        },
      }).success,
    ).toBe(false)
  })

  test('hides a card whose title or description is blank or a placeholder', () => {
    expect(isVisibleContactCard({ title: 'Teléfono', description: '2511-6566' })).toBe(true)
    expect(isVisibleContactCard({ title: 'Correo', description: '   ' })).toBe(false)
    expect(isVisibleContactCard({ title: 'Fax', description: 'Próximamente' })).toBe(false)
  })
})
