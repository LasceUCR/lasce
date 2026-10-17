import es from '@/messages/es.json' with { type: 'json' }

import { locationMapProvider, type LocationMapLabels } from './location-map'

/**
 * The shell of `/contacto`: hero, location section and back link.
 *
 * The laboratory is on the south side of the Planetario de la Universidad de Costa Rica.
 * The pin is the marked point on that building's roof (9.93699, -84.045073), not a surveyed
 * GPS reading. The contact cards themselves live in `contact_channels` and are loaded by
 * `getContactChannels`.
 *
 * The translatable shell is in the `contact` namespace of `apps/web/messages/`. The place
 * name is the same in every language and stays here.
 */

/**
 * Place name folded into the location intro, so the sentence stays readable when the map
 * fails. Each catalogue supplies the words around it ("al costado sur del" / "on the south
 * side of the").
 */
const planetariumAddress =
  'Planetario de la Universidad de Costa Rica, Ciudad de la Investigación, San Pedro de Montes de Oca, San José, Costa Rica'

const locationMarker = 'LASCE'

export interface ContactLocation {
  title: string
  intro: string
  /** The address on its own, the same string the intro already contains. */
  address: string
  coordinates: { latitude: number; longitude: number }
  zoom: number
  tileUrl: string
  attribution: string
  loadTimeoutMs: number
  markerLabel: string
  unavailableMessage: string
  labels: LocationMapLabels
}

export interface ContactContent {
  hero: { kicker: string; title: string; lead: string }
  channelsTitle: string
  location: ContactLocation
  backLink: { href: string; label: string }
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match)
}

/** The parts of a message catalogue the contact page reads. */
export type ContactMessages = Pick<typeof es, 'contact' | 'common'>

/** The contact page shell in the language of `messages`. The route passes the request's catalogue. */
export function getContactContent({ contact, common }: ContactMessages): ContactContent {
  return {
    hero: contact.hero,
    channelsTitle: contact.channelsTitle,
    location: {
      title: contact.location.title,
      intro: fill(contact.location.intro, { address: planetariumAddress }),
      address: planetariumAddress,
      coordinates: { latitude: 9.93699, longitude: -84.045073 },
      zoom: 18,
      tileUrl: locationMapProvider.tileUrl,
      attribution: locationMapProvider.attribution,
      loadTimeoutMs: locationMapProvider.loadTimeoutMs,
      markerLabel: locationMarker,
      unavailableMessage: contact.location.unavailable,
      labels: {
        regionName: fill(contact.location.mapRegion, { label: locationMarker }),
        interactiveName: fill(contact.location.mapInteractive, { label: locationMarker }),
        instructions: contact.location.mapInstructions,
        zoomInTitle: contact.location.zoomIn,
        zoomOutTitle: contact.location.zoomOut,
      },
    },
    backLink: { href: '/', label: common.backToHome },
  }
}

/** The contact page shell in Spanish, the source language. For stories and tests. */
export const contactContent: ContactContent = getContactContent(es)
