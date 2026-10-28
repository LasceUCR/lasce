import es from '@/messages/es.json' with { type: 'json' }
import type { Locale } from './i18n/config'
import type { StoredContent } from './i18n/content/definition'
import type { initiativeContent } from './initiative-schema'

/**
 * Editorial source for `/colaboraciones-e-iniciativas`. The initiative copy used to live on
 * `/nosotros`. The ISWI paragraph is the UNOOSA description, translated into Spanish. Two
 * corrections to the IVIA source: "Instituto Geofísico Nacional" is the Instituto Geográfico
 * Nacional de España, and the last sentence was cut off after "y los existen"; it closes on
 * the Northern Hemisphere, the contrast that sentence was making.
 *
 * The text is in the `collaborations` namespace of `apps/web/messages/`; this module holds the
 * structure, the links and the logos.
 *
 * These initiative items are historical fixtures for stories/tests. The public route replaces
 * them with PostgreSQL records; the migration preserves this original bilingual content.
 */
export interface CollaborationInitiative {
  id: string
  title: string
  paragraphs: readonly string[]
  /** Official site, opened in a new tab. */
  href?: string
  linkLabel?: string
  /** Mark shown beside the title. */
  logo?: { src: string; alt: string; width: number; height: number }
  contentLocale?: Locale | null
  editing?: {
    content: StoredContent<typeof initiativeContent.specs>
    isLegacy: boolean
    version: string
  }
}

export interface CollaborationsContent {
  hero: { kicker: string; title: string; lead: string }
  initiatives: {
    title: string
    items: readonly CollaborationInitiative[]
  }
  backLink: { href: string; label: string }
}

/** The parts of a message catalogue the page reads. */
export type CollaborationsMessages = Pick<typeof es, 'collaborations' | 'common'>

/** The page in the language of `messages`. The route passes the request's catalogue. */
export function getCollaborationsContent({
  collaborations,
  common,
}: CollaborationsMessages): CollaborationsContent {
  const { iswi, ivia } = collaborations.initiatives.items

  return {
    hero: collaborations.hero,
    initiatives: {
      title: collaborations.initiatives.title,
      items: [
        {
          id: 'iswi',
          title: iswi.title,
          href: 'https://www.unoosa.org/oosa/en/ourwork/psa/bssi/iswi.html',
          linkLabel: iswi.linkLabel,
          logo: { src: '/brand/logo-ISWI.png', alt: iswi.logoAlt, width: 300, height: 192 },
          paragraphs: [iswi.p1],
        },
        {
          id: 'ivia',
          title: ivia.title,
          href: 'https://oaq.epn.edu.ec/ivia-net/index.php/es/',
          linkLabel: ivia.linkLabel,
          logo: {
            src: '/brand/logo-Iniciativa-VLBI-Ibero-Americana.png',
            alt: ivia.logoAlt,
            width: 900,
            height: 300,
          },
          paragraphs: [ivia.p1, ivia.p2, ivia.p3, ivia.p4, ivia.p5],
        },
      ],
    },
    backLink: { href: '/', label: common.backToHome },
  }
}

/** The page in Spanish, the source language. For stories and tests. */
export const collaborationsContent = getCollaborationsContent(es)

export const collaborationsMeta = es.collaborations.meta
