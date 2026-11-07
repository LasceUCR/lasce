import es from '@/messages/es.json' with { type: 'json' }

import type { Locale } from '@/app/lib/i18n/config'
import type { StoredContent } from '@/app/lib/i18n/content/definition'
import { defineTranslatableContent } from '@/app/lib/i18n/content/definition'

/** Official names and acronyms are shared; only the country is editorial translated text. */
export const collaborationContent = defineTranslatableContent({
  country: {
    noun: { word: 'país', gender: 'm' },
    nouns: { en: 'country' },
    required: true,
    maxLength: 150,
  },
})

export type CollaborationScope = 'national' | 'international'

export interface ResearchCollaboration {
  id: string
  name: string
  acronym?: string
  websiteUrl?: string
  /** Bundled institutional logo under public/brand/collaborations. */
  logoPath?: string
  editing?: {
    content: StoredContent<typeof collaborationContent.specs>
    isLegacy: boolean
    version: string
  }
  /** Country name, in the visitor's language. */
  country: string
  /** Actual language of the country text; null for a legacy record's unknown base language. */
  countryLocale?: Locale | null
  scope: CollaborationScope
}

/** The `countries` map of the `collaborations` namespace of a message catalogue. */
export type CountryMessages = typeof es.collaborations.countries

// Names and acronyms are proper nouns and are the same in every language. Only the country is
// translated, so an organization stores its code and the name comes from the catalogue.
interface Organization extends Omit<ResearchCollaboration, 'country'> {
  country: keyof CountryMessages
}

const organizations: Organization[] = [
  {
    id: 'tec',
    logoPath: '/brand/collaborations/tec.png',
    websiteUrl: 'https://www.tec.ac.cr/',
    name: 'Instituto Tecnológico de Costa Rica',
    acronym: 'TEC',
    country: 'cr',
    scope: 'national',
  },
  {
    id: 'ice',
    logoPath: '/brand/collaborations/ice.png',
    websiteUrl: 'https://www.grupoice.com/',
    name: 'Instituto Costarricense de Electricidad',
    acronym: 'ICE',
    country: 'cr',
    scope: 'national',
  },
  {
    id: 'facet-unt',
    logoPath: '/brand/collaborations/facet-unt.png',
    websiteUrl: 'https://www.facet.unt.edu.ar/',
    name: 'Facultad de Ciencias Exactas y Tecnología',
    acronym: 'FACET, UNT',
    country: 'ar',
    scope: 'international',
  },
  {
    id: 'ingv',
    logoPath: '/brand/collaborations/ingv.png',
    websiteUrl: 'https://www.ingv.it/',
    name: 'Istituto Nazionale di Geofisica e Vulcanologia',
    acronym: 'INGV',
    country: 'it',
    scope: 'international',
  },
  {
    id: 'ictp',
    logoPath: '/brand/collaborations/ictp.png',
    websiteUrl: 'https://www.ictp.it/',
    name: 'Science, Technology and Innovation Unit, The Abdus Salam International Centre for Theoretical Physics',
    acronym: 'ICTP',
    country: 'it',
    scope: 'international',
  },
  {
    id: 'opm',
    logoPath: '/brand/collaborations/observatoire-de-paris.png',
    websiteUrl: 'https://observatoiredeparis.psl.eu/',
    name: 'Observatoire de Paris, Meudon',
    acronym: 'OPM',
    country: 'fr',
    scope: 'international',
  },
  {
    id: 'sciesmex',
    logoPath: '/brand/collaborations/sciesmex.png',
    websiteUrl: 'https://www.sciesmex.unam.mx/',
    name: 'Servicio de Clima Espacial México',
    acronym: 'SCiESMEX',
    country: 'mx',
    scope: 'international',
  },
  {
    id: 'inaoe',
    logoPath: '/brand/collaborations/inaoe.png',
    websiteUrl: 'https://www.inaoep.mx/',
    name: 'Instituto Nacional de Astrofísica, Óptica y Electrónica',
    acronym: 'INAOE',
    country: 'mx',
    scope: 'international',
  },
]

/** Static fixtures for stories and tests. The public route reads collaboration-records.ts. */
export function getResearchCollaborations(
  countries: CountryMessages = es.collaborations.countries,
): ResearchCollaboration[] {
  return organizations.map((organization) => ({
    ...organization,
    country: countries[organization.country],
  }))
}

/** The partner organizations in Spanish, the source language. For stories and tests. */
export const researchCollaborations: ResearchCollaboration[] = getResearchCollaborations()
