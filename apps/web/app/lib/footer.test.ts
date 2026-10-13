import { describe, expect, test } from 'vitest'

import { getMessages } from './i18n/messages'
import { footerContent, getFooterContent, type FooterMessageKey } from './footer'

describe('footer content', () => {
  test('is Spanish by default', () => {
    expect(footerContent.institutionsLabel).toBe('Instituciones')
    expect(footerContent.copyright.notice).toBe('Todos los derechos reservados.')
  })

  test('takes its translatable text from the translator it is given', () => {
    const en = getMessages('en').footer
    const content = getFooterContent((key: FooterMessageKey) => en[key])

    expect(content.institutionsLabel).toBe('Institutions')
    expect(content.navigationLabel).toBe('Footer links')
    expect(content.links.map((link) => link.label)).toEqual(['Contact', 'Instagram'])
    expect(content.copyright.notice).toBe('All rights reserved.')
  })

  test('keeps institutions, links and the partner logo the same in every language', () => {
    const en = getMessages('en').footer
    const content = getFooterContent((key: FooterMessageKey) => en[key])

    expect(content.institutions).toEqual(footerContent.institutions)
    expect(content.partnerLogo).toEqual(footerContent.partnerLogo)
    expect(content.links.map((link) => link.href)).toEqual(
      footerContent.links.map((link) => link.href),
    )
  })
})
