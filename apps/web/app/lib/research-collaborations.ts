export type CollaborationScope = 'national' | 'international'

export interface ResearchCollaboration {
  id: string
  name: string
  acronym?: string
  country: string
  scope: CollaborationScope
}

export const researchCollaborations: ResearchCollaboration[] = [
  {
    id: 'tec',
    name: 'Instituto Tecnológico de Costa Rica',
    acronym: 'TEC',
    country: 'Costa Rica',
    scope: 'national',
  },
  {
    id: 'ice',
    name: 'Instituto Costarricense de Electricidad',
    acronym: 'ICE',
    country: 'Costa Rica',
    scope: 'national',
  },
  {
    id: 'facet-unt',
    name: 'Facultad de Ciencias Exactas y Tecnología',
    acronym: 'FACET, UNT',
    country: 'Argentina',
    scope: 'international',
  },
  {
    id: 'ingv',
    name: 'Istituto Nazionale di Geofisica e Vulcanologia',
    acronym: 'INGV',
    country: 'Italia',
    scope: 'international',
  },
  {
    id: 'ictp',
    name: 'Science, Technology and Innovation Unit, The Abdus Salam International Centre for Theoretical Physics',
    acronym: 'ICTP',
    country: 'Italia',
    scope: 'international',
  },
  {
    id: 'opm',
    name: 'Observatoire de Paris, Meudon',
    acronym: 'OPM',
    country: 'Francia',
    scope: 'international',
  },
  {
    id: 'sciesmex',
    name: 'Servicio de Clima Espacial México',
    acronym: 'SCiESMEX',
    country: 'México',
    scope: 'international',
  },
  {
    id: 'inaoe',
    name: 'Instituto Nacional de Astrofísica, Óptica y Electrónica',
    acronym: 'INAOE',
    country: 'México',
    scope: 'international',
  },
]

export function getResearchCollaborations(): ResearchCollaboration[] {
  return researchCollaborations
}
