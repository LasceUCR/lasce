import { describe, expect, test } from 'vitest'

import { getMessages } from './i18n/messages'
import { contactContent, getContactContent } from './contact'

describe('contact content', () => {
  test('publishes the planetarium location and the contact section title', () => {
    expect(contactContent.location.address).toBe(
      'Planetario de la Universidad de Costa Rica, Ciudad de la Investigación, San Pedro de Montes de Oca, San José, Costa Rica',
    )
    expect(contactContent.location.intro).toBe(
      'El Laboratorio de Astrofísica Solar y Clima Espacial se encuentra al costado sur del Planetario de la Universidad de Costa Rica, Ciudad de la Investigación, San Pedro de Montes de Oca, San José, Costa Rica.',
    )
    expect(contactContent.location.coordinates).toEqual({
      latitude: 9.93699,
      longitude: -84.045073,
    })
    expect(contactContent.location.markerLabel).toBe('LASCE')
    expect(contactContent.channelsTitle).toBe('Información de contacto')
  })

  test('is Spanish by default and follows the catalogue it is given', () => {
    const english = getContactContent(getMessages('en'))

    expect(contactContent.hero.title).toBe('Contacto')
    expect(contactContent.backLink).toEqual({ href: '/', label: 'Volver al inicio' })
    expect(english.hero.title).toBe('Contact')
    expect(english.channelsTitle).toBe('Contact information')
    expect(english.location.title).toBe('Location')
    expect(english.location.intro).toBe(
      'The Laboratorio de Astrofísica Solar y Clima Espacial is on the south side of the Planetario de la Universidad de Costa Rica, Ciudad de la Investigación, San Pedro de Montes de Oca, San José, Costa Rica.',
    )
    expect(english.location.labels.zoomInTitle).toBe('Zoom in')
    expect(english.backLink).toEqual({ href: '/', label: 'Back to home' })
  })

  test('keeps the address and the map point the same in every language', () => {
    const english = getContactContent(getMessages('en'))

    expect(english.location.address).toBe(contactContent.location.address)
    expect(english.location.coordinates).toEqual(contactContent.location.coordinates)
    expect(english.location.markerLabel).toBe(contactContent.location.markerLabel)
  })
})
