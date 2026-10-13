import es from '@/messages/es.json' with { type: 'json' }

import { INSTAGRAM_URL } from './footer'

/**
 * Official contact channels for `/contacto`.
 *
 * The phone number and the Rodrigo Facio address were provided by LASCE.
 * Instagram reuses the profile already approved for the public footer.
 * A channel with an empty or placeholder value is dropped by
 * `availableContactChannels` and never rendered.
 *
 * The translatable text is in the `contact` namespace of `apps/web/messages/`. The phone number,
 * the address and the Instagram handle are the same in every language and stay here.
 */

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

export interface ContactContent {
  hero: { kicker: string; title: string; lead: string }
  channelsTitle: string
  channels: readonly ContactChannel[]
  backLink: { href: string; label: string }
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
        id: 'location',
        label: contact.channels.location,
        lines: [
          'Universidad de Costa Rica, Sede Rodrigo Facio Brenes',
          'Montes de Oca, San José, Costa Rica',
        ],
      },
      {
        id: 'instagram',
        label: 'Instagram',
        value: '@lasce_ucr',
        href: INSTAGRAM_URL,
        external: true,
      },
    ],
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
