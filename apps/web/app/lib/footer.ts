// The import attribute is for Playwright: `tests/e2e/public-portal.spec.ts` imports this module
// under Node's own ESM loader, which refuses a JSON module without it.
import es from '@/messages/es.json' with { type: 'json' }

/**
 * Everything the public footer shows. The translatable strings live in the `footer` namespace of
 * `apps/web/messages/`; institution names, places and links are the same in every language and
 * stay here. Edit either place, not `PublicFooter.tsx`.
 *
 * The institution links and the copyright wording were confirmed for LASCE-PUB-012. The LASCE
 * full name follows the approved "Nosotros" copy in `app/lib/nosotros.ts`; `app/layout.tsx`
 * metadata still expands it as "Laboratorio de Ciencias Espaciales" and is out of scope here.
 */
export interface FooterInstitution {
  /** Visible text, for example `CINESPA`. */
  label: string
  /** Full name, exposed as an `<abbr>` tooltip when the label is an abbreviation. */
  name?: string
  /** Official website. Omit to render plain text: LASCE is this portal. */
  href?: string
}

export interface FooterLink {
  label: string
  href: string
  /** Opens in a new tab with `rel="noreferrer"`. */
  external?: boolean
}

export interface FooterPartnerLogo {
  /** Alt text for the logo, which is also the link's accessible name. */
  name: string
  href: string
  /** Path under `apps/web/public`, beside the other institutional logos. */
  src: string
  width: number
  height: number
}

export interface PublicFooterContent {
  /** Names shown beside the logo, in order. */
  institutions: readonly FooterInstitution[]
  institutionsLabel: string
  location: string
  /** Collaborating organisation shown before the footer links. */
  partnerLogo: FooterPartnerLogo
  navigationLabel: string
  links: readonly FooterLink[]
  copyright: { holder: string; notice: string }
}

/** The laboratory's Instagram profile, also offered as a contact channel on `/contacto`. */
export const INSTAGRAM_URL = 'https://www.instagram.com/lasce_ucr/'

/** A key of the `footer` namespace in the message catalogues. */
export type FooterMessageKey = keyof typeof es.footer

/**
 * Builds the footer in the language of `t`. The layout passes the request's translator, which
 * keeps `PublicFooter` presentational: it still receives plain strings.
 */
export function getFooterContent(t: (key: FooterMessageKey) => string): PublicFooterContent {
  return {
    institutions: [
      { label: 'Universidad de Costa Rica', href: 'https://www.ucr.ac.cr/' },
      {
        label: 'CINESPA',
        name: 'Centro de Investigaciones Espaciales',
        href: 'https://cinespa.ucr.ac.cr/',
      },
      {
        label: 'LASCE',
        name: 'Laboratorio de Astrofísica Solar y Clima Espacial',
        href: 'https://lasce.ucr.ac.cr/',
      },
    ],
    institutionsLabel: t('institutionsLabel'),
    location: 'San Pedro de Montes de Oca',
    partnerLogo: {
      name: 'International Space Weather Initiative (ISWI)',
      href: 'https://www.iswi-secretariat.org/',
      src: '/brand/logo-ISWI.png',
      width: 300,
      height: 192,
    },
    navigationLabel: t('navigationLabel'),
    links: [
      { label: t('contact'), href: '/contacto' },
      { label: 'Instagram', href: INSTAGRAM_URL, external: true },
    ],
    copyright: { holder: 'Universidad de Costa Rica', notice: t('rightsReserved') },
  }
}

/**
 * The footer in Spanish, the source language. For stories, tests and callers that only need its
 * language-independent parts; a page renders `getFooterContent` with the request's translator.
 */
export const footerContent: PublicFooterContent = getFooterContent((key) => es.footer[key])
