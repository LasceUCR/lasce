import es from '@/messages/es.json' with { type: 'json' }

export type CollaborationScope = 'national' | 'international'

export interface ResearchCollaboration {
  id: string
  name: string
  acronym?: string
  /** Country name, in the visitor's language. */
  country: string
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
    name: 'Instituto Tecnológico de Costa Rica',
    acronym: 'TEC',
    country: 'cr',
    scope: 'national',
  },
  {
    id: 'ice',
    name: 'Instituto Costarricense de Electricidad',
    acronym: 'ICE',
    country: 'cr',
    scope: 'national',
  },
  {
    id: 'facet-unt',
    name: 'Facultad de Ciencias Exactas y Tecnología',
    acronym: 'FACET, UNT',
    country: 'ar',
    scope: 'international',
  },
  {
    id: 'ingv',
    name: 'Istituto Nazionale di Geofisica e Vulcanologia',
    acronym: 'INGV',
    country: 'it',
    scope: 'international',
  },
  {
    id: 'ictp',
    name: 'Science, Technology and Innovation Unit, The Abdus Salam International Centre for Theoretical Physics',
    acronym: 'ICTP',
    country: 'it',
    scope: 'international',
  },
  {
    id: 'opm',
    name: 'Observatoire de Paris, Meudon',
    acronym: 'OPM',
    country: 'fr',
    scope: 'international',
  },
  {
    id: 'sciesmex',
    name: 'Servicio de Clima Espacial México',
    acronym: 'SCiESMEX',
    country: 'mx',
    scope: 'international',
  },
  {
    id: 'inaoe',
    name: 'Instituto Nacional de Astrofísica, Óptica y Electrónica',
    acronym: 'INAOE',
    country: 'mx',
    scope: 'international',
  },
]

/** The partner organizations, with each country named in the language of `countries`. */
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
