import { describe, expect, test } from 'vitest'

import { footerContent } from './footer'
import {
  availableContactChannels,
  contactContent,
  isAvailableContactChannel,
  type ContactChannel,
} from './contact'

describe('contact content', () => {
  test('publishes the LASCE phone, the Rodrigo Facio address and the approved Instagram profile', () => {
    const phone = contactContent.channels.find((channel) => channel.id === 'phone')
    const location = contactContent.channels.find((channel) => channel.id === 'location')
    const instagram = contactContent.channels.find((channel) => channel.id === 'instagram')
    const footerInstagram = footerContent.links.find((link) => link.label === 'Instagram')

    expect(phone).toMatchObject({ value: '2511-6566', href: 'tel:+50625116566' })
    expect(location?.lines).toEqual([
      'Universidad de Costa Rica, Sede Rodrigo Facio Brenes',
      'Montes de Oca, San José, Costa Rica',
    ])
    expect(instagram?.href).toBe(footerInstagram?.href)
    expect(availableContactChannels(contactContent.channels)).toHaveLength(
      contactContent.channels.length,
    )
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
