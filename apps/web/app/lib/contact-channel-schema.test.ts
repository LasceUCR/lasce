import { describe, expect, test } from 'vitest'

import {
  contactCardLink,
  contactChannelCreateSchema,
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

  test('hides a card whose title or description is blank or a placeholder', () => {
    expect(isVisibleContactCard({ title: 'Teléfono', description: '2511-6566' })).toBe(true)
    expect(isVisibleContactCard({ title: 'Correo', description: '   ' })).toBe(false)
    expect(isVisibleContactCard({ title: 'Fax', description: 'Próximamente' })).toBe(false)
  })
})
