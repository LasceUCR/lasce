import { describe, expect, test } from 'vitest'

import { footerContent } from './footer'
import { getMessages } from './i18n/messages'
import {
  availableContactChannels,
  contactContent,
  getContactContent,
  isAvailableContactChannel,
  type ContactChannel,
} from './contact'

describe('contact content', () => {
  test('publishes the LASCE phone, the planetarium location and the approved Instagram profile', () => {
    const phone = contactContent.channels.find((channel) => channel.id === 'phone')
    const instagram = contactContent.channels.find((channel) => channel.id === 'instagram')
    const footerInstagram = footerContent.links.find((link) => link.label === 'Instagram')

    expect(phone).toMatchObject({ value: '2511-6566', href: 'tel:+50625116566' })
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
    expect(instagram?.href).toBe(footerInstagram?.href)
    expect(availableContactChannels(contactContent.channels)).toHaveLength(
      contactContent.channels.length,
    )
  })

  test('is Spanish by default and follows the catalogue it is given', () => {
    const english = getContactContent(getMessages('en'))

    expect(contactContent.hero.title).toBe('Contacto')
    expect(contactContent.backLink).toEqual({ href: '/', label: 'Volver al inicio' })
    expect(english.hero.title).toBe('Contact')
    expect(english.channels.map((channel) => channel.label)).toEqual(['Phone', 'Instagram'])
    expect(english.location.title).toBe('Location')
    expect(english.location.intro).toBe(
      'The Solar Astrophysics and Space Weather Laboratory is on the south side of the Planetario de la Universidad de Costa Rica, Ciudad de la Investigación, San Pedro de Montes de Oca, San José, Costa Rica.',
    )
    expect(english.location.labels.zoomInTitle).toBe('Zoom in')
    expect(english.backLink).toEqual({ href: '/', label: 'Back to home' })
  })

  test('keeps the phone, the address and the links the same in every language', () => {
    const english = getContactContent(getMessages('en'))
    const values = (content: typeof contactContent) =>
      content.channels.map(({ id, value, lines, href }) => ({ id, value, lines, href }))

    expect(values(english)).toEqual(values(contactContent))
    expect(english.location.address).toBe(contactContent.location.address)
    expect(english.location.coordinates).toEqual(contactContent.location.coordinates)
    expect(english.location.markerLabel).toBe(contactContent.location.markerLabel)
  })

  test('drops a channel whose value or link is missing or still a placeholder', () => {
    const channels: ContactChannel[] = [
      { id: 'phone', label: 'Teléfono', value: '2511-6566', href: 'tel:+50625116566' },
      { id: 'email', label: 'Correo', value: '   ', href: 'mailto:' },
      { id: 'fax', label: 'Fax', value: 'Próximamente' },
      { id: 'web', label: 'Sitio', value: 'ejemplo', href: '#' },
    ]

    expect(channels.filter(isAvailableContactChannel).map((channel) => channel.id)).toEqual([
      'phone',
    ])
    expect(availableContactChannels(channels).map((channel) => channel.id)).toEqual(['phone'])
  })
})
