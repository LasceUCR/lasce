import { footerContent } from './footer'

/**
 * Official contact channels for `/contacto`.
 *
 * The phone number and the Rodrigo Facio address were provided by LASCE.
 * Instagram reuses the profile already approved for the public footer.
 * A channel with an empty or placeholder value is dropped by
 * `availableContactChannels` and never rendered.
 */

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

export const contactMeta = {
  title: 'Contacto | LASCE',
  description:
    'Canales oficiales para comunicarse con el Laboratorio de Astrofísica Solar y Clima Espacial de la Universidad de Costa Rica.',
} as const

const instagram = footerContent.links.find((link) => link.label === 'Instagram' && link.external)

export const contactContent: ContactContent = {
  hero: {
    kicker: 'Portal público LASCE',
    title: 'Contacto',
    lead: 'Canales oficiales del Laboratorio de Astrofísica Solar y Clima Espacial.',
  },
  channelsTitle: 'Información de contacto',
  channels: [
    {
      id: 'phone',
      label: 'Teléfono',
      value: '2511-6566',
      href: 'tel:+50625116566',
    },
    {
      id: 'location',
      label: 'Ubicación',
      lines: [
        'Universidad de Costa Rica, Sede Rodrigo Facio Brenes',
        'Montes de Oca, San José, Costa Rica',
      ],
    },
    ...(instagram
      ? [
          {
            id: 'instagram',
            label: 'Instagram',
            value: '@lasce_ucr',
            href: instagram.href,
            external: true,
          },
        ]
      : []),
  ],
  backLink: { href: '/', label: 'Volver al inicio' },
}

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
