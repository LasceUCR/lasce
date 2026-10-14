import es from '@/messages/es.json' with { type: 'json' }

import { INSTAGRAM_URL } from './footer'
import { locationMapProvider, type LocationMapLabels } from './location-map'

/**
 * Official contact channels for `/contacto`.
 *
 * The phone number was provided by LASCE. Instagram reuses the profile already approved for
 * the public footer. The laboratory is on the south side of the Planetario de la Universidad
 * de Costa Rica. The pin is the marked point on that building's roof (9.936990, -84.045073),
 * not a surveyed GPS reading.
 * A channel with an empty or placeholder value is dropped by
 * `availableContactChannels` and never rendered.
 *
 * The translatable text is in the `contact` namespace of `apps/web/messages/`. The phone
 * number, the place name and the Instagram handle are the same in every language and stay here.
 */

/**
 * Place name folded into the location intro, so the sentence stays readable when the map
 * fails. Each catalogue supplies the words around it ("al costado sur del" / "on the south
 * side of the").
 */
const planetariumAddress =
  'Planetario de la Universidad de Costa Rica, Ciudad de la Investigación, San Pedro de Montes de Oca, San José, Costa Rica'

const locationMarker = 'LASCE'

// Matched against channel values, which are not translated, so Spanish words are enough.

const placeholderValue =
  /^(n\/?a|pendiente|pr[oó]ximamente|por definir|contenido en preparaci[oó]n|ejemplo|placeholder|xxx+|-+)$/i

export interface ContactChannel {
  id: string
  label: string
  /** Visible value. Blank or a placeholder means the channel is not available. */
  value?: string
  /** Extra lines, used by the address. Each one must be a complete value. */
  lines?: readonly string[]
  /** `tel:` or `https:` destination. Omit for a value that is not a link. */
  href?: string
  /** Opens in a new tab with `rel="noreferrer"`. */
  external?: boolean
}

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
  channels: readonly ContactChannel[]
  location: ContactLocation
  backLink: { href: string; label: string }
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match)
}

/** The parts of a message catalogue the contact page reads. */
export type ContactMessages = Pick<typeof es, 'contact' | 'common'>

/** The contact page in the language of `messages`. The route passes the request's catalogue. */
export function getContactContent({ contact, common }: ContactMessages): ContactContent {
  return {
    hero: contact.hero,
    channelsTitle: contact.channelsTitle,
    channels: [
      {
        id: 'phone',
        label: contact.channels.phone,
        value: '2511-6566',
        href: 'tel:+50625116566',
      },
      {
        id: 'instagram',
        label: 'Instagram',
        value: '@lasce_ucr',
        href: INSTAGRAM_URL,
        external: true,
      },
    ],
    location: {
      title: contact.location.title,
      intro: fill(contact.location.intro, { address: planetariumAddress }),
      address: planetariumAddress,
      coordinates: { latitude: 9.93699, longitude: -84.045073 },
      zoom: 17,
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

/** The contact page in Spanish, the source language. For stories and tests. */
export const contactContent: ContactContent = getContactContent(es)

function channelLines(channel: ContactChannel): string[] {
  return [channel.value, ...(channel.lines ?? [])].filter(
    (line): line is string => line !== undefined,
  )
}

export function isAvailableContactChannel(channel: ContactChannel): boolean {
  const lines = channelLines(channel).map((line) => line.trim())
  if (
    lines.length === 0 ||
    lines.some((line) => line.length === 0 || placeholderValue.test(line))
  ) {
    return false
  }

  if (channel.href !== undefined) {
    const href = channel.href.trim()
    if (href.length === 0 || href === '#' || href === 'tel:' || href === 'mailto:') {
      return false
    }
  }

  return true
}

export function availableContactChannels(channels: readonly ContactChannel[]): ContactChannel[] {
  return channels.filter(isAvailableContactChannel)
}
