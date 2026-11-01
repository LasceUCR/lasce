import { prisma, type Prisma } from '@lasce/db'
import { z } from 'zod'

import es from '@/messages/es.json' with { type: 'json' }
import { defaultLocale, type Locale } from '@/app/lib/i18n/config'
import {
  defineTranslatableContent,
  type FieldOf,
  type StoredContent,
} from '@/app/lib/i18n/content/definition'
import { baseContent, resolveContent, storedContentFrom } from '@/app/lib/i18n/content/resolve'
import {
  isCurrentVersion,
  nextUpdatedAt,
  parseVersion,
  toVersion,
  versionSchema,
} from '@/app/lib/cms/version'
import { findPendingReviews } from '@/app/lib/i18n/content/review'
import type { ReviewConfirmation } from '@/app/lib/i18n/content/definition'

import { changedFieldNames, recordUserAuditEvent, type AuditActor } from './audit-log'
import { runAuditedDelete } from './cms/transaction'
import {
  getRosacConstructionContent,
  type ConstructionContent,
  type ConstructionImage,
  type ConstructionStage,
} from './rosac-construction'
import {
  getRosacInstrumentsContent,
  type RosacInstrumentCardContent,
  type RosacInstrumentsContent,
} from './rosac-instruments'
import { locationMapProvider, type LocationMapLabels } from './location-map'

// Built once and reused in both `location.intro` (as flowing prose) and `location.address`
// (as its own field, kept for anything that needs the bare address rather than a sentence),
// so the two can never drift apart.
const rosacLocationAddress =
  'Recinto de Santa Cruz, Universidad de Costa Rica, Santa Cruz, Guanacaste, Costa Rica'

/**
 * Editorial source: LASCE_ROSAC_quienes_somos_y_que_hacemos.docx, supplied by LASCE.
 * Sections: ROSAC, ¿Qué hacemos?, ¿Por qué observar en radio? and La relación entre ambos.
 * Preserve the distinction between development goals and operational capabilities.
 * This module describes the public information page only; scientific consultation is separate.
 *
 * `team.people` is persisted in Postgres (LASCE-CON-012-085) and fetched by `getResearchers()`;
 * the hardcoded array below is only a fallback fixture for Storybook and tests, never what the
 * real `/radioastronomia` route renders. Names, roles, emails and institution are on the front of
 * each card, and the description is on the back after a click. They are rendered as HTML in
 * `ResearcherCard`. `team.people[].src` is either a local path under `apps/web/public` or a MinIO
 * URL from the admin form's photo upload — see `next.config.ts`'s `images.remotePatterns`.
 *
 * `institution` is the affiliation shown as `Institución: {institution}`. `email` is only set when
 * LASCE supplied a public address, or an admin added one through the form.
 */
export const rosacInfoMeta = es.rosac.meta

export const rosacCardIcons = [
  'antenna',
  'location',
  'frequency',
  'sun',
  'tracking',
  'control',
  'receiver',
  'maintenance',
  'education',
] as const

export type RosacCardIcon = (typeof rosacCardIcons)[number]

export class RosacConflictError extends Error {
  constructor(
    message = 'El elemento cambió desde que lo abrió. Recárguelo y vuelva a aplicar sus cambios.',
  ) {
    super(message)
    this.name = 'RosacConflictError'
  }
}

export class RosacReviewRequiredError extends Error {
  readonly pending: readonly ReviewConfirmation<string>[]
  constructor(pending: readonly ReviewConfirmation<string>[]) {
    super(
      'Cambió un campo en un solo idioma. Actualice el campo equivalente en el otro idioma o confirme que sigue siendo correcto.',
    )
    this.name = 'RosacReviewRequiredError'
    this.pending = pending
  }
}

export interface TeamMember {
  id: string
  /** Local path under `apps/web/public`, or a session-local `blob:` URL for a
   * photo picked in the admin form before a real upload endpoint exists. */
  src: string
  /** Rendered as visible text, never as alt text. */
  name: string
  /** The category shown at the top of the card, for example `Investigador`. */
  role: string
  /** Zero, one or two public addresses, when LASCE supplied them. */
  email?: string | readonly string[]
  /** Provisional institution shown as `Institución: {institution}`. */
  institution: string
  description?: string
  /** The lang of role and description, e.g. 'es' or 'en'. */
  contentLang?: string
  /** The stored base role before UI localization, used to initialize single-language edit forms. */
  storedRole?: string
  /** The stored base description before UI localization, used to initialize single-language edit forms. */
  storedDescription?: string | null
}

interface RosacTextSection {
  title: string
  paragraphs: readonly string[]
}

export interface RosacCardItem {
  id: string
  icon: RosacCardIcon
  title: string
  description: string
  editing?: {
    content: {
      es: { title: string; description: string }
      en: { title: string; description: string } | null
    }
    isLegacy: boolean
    version: string
  }
}

interface RosacCardSection {
  title: string
  items: readonly RosacCardItem[]
}

export interface RosacLocationContent {
  title: string
  intro: string
  /**
   * Not rendered on its own -- folded into `intro`'s own text, so the address stays visible
   * whether the map loads, fails, or is still downloading, without a second, near-duplicate
   * line of text next to it. Kept as its own field so `intro` only needs to be built from it
   * once (see `rosacInfoContent.location` below), not typed out twice.
   */
  address: string
  /**
   * Google Maps' pin for "Radiobservatorio de Santa Cruz ROSAC UCR", confirmed by the
   * team as the correct location. Not a surveyed GPS point, but accurate enough for
   * wayfinding.
   */
  coordinates: { latitude: number; longitude: number }
  /** Leaflet zoom level for the initial view. Higher is closer. */
  zoom: number
  tileUrl: string
  attribution: string
  loadTimeoutMs: number
  /** Shown in a permanent tooltip on the marker, so it reads without a click. */
  markerLabel: string
  /** Shown instead of the map if it fails to load; the address remains either way. */
  unavailableMessage: string
  labels: LocationMapLabels
}

export interface RosacInfoContent {
  hero: {
    kicker: string
    title: string
    lead?: string
    image: {
      src: string
      alt: string
      presentation: 'banner'
      width: number
      height: number
      focus?: 'left' | 'center' | 'right'
      mobileSrc?: string
    }
  }
  overview: RosacTextSection
  characteristics: RosacCardSection
  location: RosacLocationContent
  activities: RosacCardSection
  construction: ConstructionContent
  instruments: RosacInstrumentsContent
  radioObservation: RosacTextSection
  relationship: RosacTextSection
  team: {
    title: string
    intro: string
    hint: string
    emptyMessage: string
    institutionLabel: string
    people: readonly TeamMember[]
  }
  acknowledgments: {
    title: string
    subtitle: string
    institutions: readonly RosacAcknowledgment[]
  }
  donations: {
    title: string
    subtitle: string
    items: readonly RosacDonation[]
    cta: { title: string; description: string; buttonLabel: string; href: string }
  }
  backLink: { href: string; label: string }
}

/**
 * One acknowledged institution — a logo, kept square and undistorted, plus its name.
 * `href` is omitted for an institution whose official site hasn't been confirmed yet;
 * its card then renders as a plain, non-interactive tile instead of guessing a URL.
 */
export interface RosacAcknowledgment {
  id?: string
  name: string
  href?: string
  logo: { src: string; alt: string }
}

/** One donation announcement — a photo and a short write-up of the contribution. */
export interface RosacDonation {
  title: string
  description: string
  image: { src: string; alt: string }
}
export const defaultTeamPeople: readonly TeamMember[] = [
  {
    id: 'carolina-salas',
    src: '/images/ROSAC/team/CarolinaSalas.jpg',
    name: 'Dra. Carolina Salas Matamoros',
    role: 'Investigadora principal',
    email: 'carolina.salas_mata@ucr.ac.cr',
    institution: 'Centro de Investigaciones Espaciales (CINESPA), UCR',
    description:
      'Responsable de la planificación estratégica de los recursos necesarios para el adecuado montaje e instalación del radiotelescopio, así como líder en la gestión y análisis de los datos obtenidos a través de dicho instrumento.',
  },
  {
    id: 'miguel-velazquez',
    src: '/images/ROSAC/team/MiguelVelazquez.jpg',
    name: 'Dr. Miguel Velázquez',
    role: 'Investigador',
    email: 'miguel.velazquez@ucr.ac.cr',
    institution: 'Instituto Nacional de Astrofísica, Óptica y Electrónica, México',
    description: 'Encargado del desarrollo de la instrumentación en ROSAC.',
  },
  {
    id: 'david-gale',
    src: '/images/ROSAC/team/DavidGale.jpg',
    name: 'Dr. David Gale',
    role: 'Investigador',
    email: 'david.gale@ucr.ac.cr',
    institution: 'Instituto Nacional de Astrofísica, Óptica y Electrónica (INAOE), Puebla, México',
    description:
      'Instalación y alineación de los reflectores del telescopio. Sistemas mecánicos, pruebas de movimiento, protección contra descargas eléctricas. Apoyo en general.',
  },
  {
    id: 'oscar-nunez',
    src: '/images/ROSAC/team/OscarNunez.jpg',
    name: 'Dr. Óscar Núñez',
    role: 'Investigador',
    email: 'oscar.nunezmata@ucr.ac.cr',
    institution: 'Escuela de Ingeniería Eléctrica, UCR',
    description: 'Encargado del sistema eléctrico y soporte técnico en los motorreductores.',
  },
  {
    id: 'federico-ruiz',
    src: '/images/ROSAC/team/FedericoRuiz.png',
    name: 'Dr. Federico Ruiz',
    role: 'Investigador',
    email: 'federico.ruizugalde@ucr.ac.cr',
    institution: 'Instituto de Investigaciones en Ingeniería (INII), UCR',
    description:
      'Encargado de la implementación y puesta en operación de los sensores y actuadores, así como del desarrollo del controlador y de los sistemas de software asociados al radiotelescopio ROSAC.',
  },
  {
    id: 'gustavo-lara',
    src: '/images/ROSAC/team/GustavoLara.jpg',
    name: 'MSc. Gustavo Lara',
    role: 'Investigador',
    email: 'gustavo.lara@ucr.ac.cr',
    institution: 'Escuela de Ingeniería Topográfica, UCR',
    description:
      'Encargado del control técnico y geodésico, ejecutando desde la nivelación de la base, la calibración angular, el monitoreo de deformaciones de la parábola y el diseño de la red de control. Provee los datos paramétricos para la configuración y el funcionamiento del software de control y seguimiento del radiotelescopio.',
  },
  {
    id: 'andres-fallas',
    src: '/images/ROSAC/team/AndresFallas.jpg',
    name: 'Ing. Andrés Fallas',
    role: 'Investigador',
    email: 'andres.fallas@ucr.ac.cr',
    institution: 'Escuela de Ingeniería Topográfica, UCR',
    description:
      'Encargado del control técnico y geodésico, ejecutando desde la nivelación de la base, la calibración angular, el monitoreo de deformaciones de la parábola y el diseño de la red de control. Provee los datos paramétricos para la configuración y el funcionamiento del software de control y seguimiento del radiotelescopio.',
  },
  {
    id: 'wagner-mejias',
    src: '/images/ROSAC/team/WagnerMejias.jpg',
    name: 'MSc. Wagner Mejías',
    role: 'Investigador',
    email: 'wagner.mejias@ucr.ac.cr',
    institution: 'Escuela de Ingeniería Mecánica, UCR',
    description:
      'Instalación mecánica de la estructura, mantenimiento preventivo y correctivo, adaptaciones y mejoras en la estructura en general.',
  },
  {
    id: 'eduardo-ibarra',
    src: '/images/ROSAC/team/EduardoIbarra.jpg',
    name: 'Dr. Eduardo Ibarra',
    role: 'Colaborador externo',
    institution: 'Investigador en ingeniería de microondas en Quantum Motion Technologies, Londres',
    description:
      'Colaborador en el desarrollo y pruebas de la etapa de recepción en el rango de 100 MHz a 1.1 GHz, el análisis de sensibilidad del receptor, el diseño del radiotelescopio y en las labores de instalación eléctrica y control del sistema de guiado de la antena.',
  },
  {
    id: 'andres-corrales',
    src: '/images/ROSAC/team/AndresCorrales.jpg',
    name: 'Ing. Andrés Corrales',
    role: 'Colaborador externo',
    institution: 'Hewlett Packard Enterprise, Costa Rica',
    description:
      'Diseñador, desarrollador y mantenedor del software de control del radiotelescopio y software de usuario final.',
  },
  {
    id: 'andres-gamboa',
    src: '/images/ROSAC/team/AndresGamboa.jpg',
    name: 'Ing. Andrés Gamboa',
    role: 'Colaborador externo',
    institution: 'Cirtec Medical Enterprise',
    description:
      'Apoyo en tareas de mantenimiento del radiotelescopio, así como en labores electromecánicas relacionadas con el montaje de instrumentos.',
  },
  {
    id: 'jelmuth-rojas',
    src: '/images/ROSAC/team/JelmutRojas.jpg',
    name: 'Jelmuth Rojas',
    role: 'Colaborador externo',
    institution: 'INDI CR',
    description: 'Apoyo en tareas de nivelación de la estructura.',
  },
  {
    id: 'barnald-bocker',
    src: '/images/ROSAC/team/BarnaldBocker-2.jpg',
    name: 'Barnald Bocker',
    role: 'Asistente',
    institution: 'Estudiante de la Escuela de Física, UCR',
    description:
      'Apoyo en el desarrollo y mantenimiento del software de control del ROSAC y protocolos de comunicación.',
  },
  {
    id: 'fabian-chaverri',
    src: '/images/ROSAC/team/FabianChaverri.jpg',
    name: 'MSc. Fabián Chaverri',
    role: 'Futuro estudiante de doctorado',
    institution: 'Centro de Investigaciones Espaciales (CINESPA), UCR',
    description:
      'Futuro estudiante de doctorado con tesis en instrumentación astronómica ligada al proyecto.',
  },
]

export const rosacInstitutions: readonly RosacAcknowledgment[] = [
  {
    name: 'Vicerrectoría de Investigación, UCR',
    href: 'https://vinv.ucr.ac.cr',
    logo: {
      src: '/images/ROSAC/acknowledgments/vicerrectoria-investigacion.webp',
      alt: 'Logo de la Vicerrectoría de Investigación de la Universidad de Costa Rica',
    },
  },

  {
    name: 'Centro de Investigaciones Espaciales (CINESPA), UCR',
    href: 'https://cinespa.ucr.ac.cr',
    logo: {
      src: '/images/ROSAC/acknowledgments/cinespa.webp',
      alt: 'Logo del Centro de Investigaciones Espaciales (CINESPA)',
    },
  },
  {
    name: 'Escuela de Física, UCR',
    href: 'https://fisica.ucr.ac.cr',
    logo: {
      src: '/images/ROSAC/acknowledgments/efis.webp',
      alt: 'Logo de la Escuela de Física, UCR',
    },
  },
  {
    name: 'Escuela de Ingeniería Mecánica, UCR',
    href: 'https://www.ucr.ac.cr/directorio/escuela-de-ingenieria-mecanica.html',
    logo: {
      src: '/images/ROSAC/acknowledgments/eim.webp',
      alt: 'Logo de la Escuela de Ingeniería Mecánica, UCR',
    },
  },
  {
    name: 'Escuela de Ingeniería Topográfica, UCR',
    href: 'https://eit.ucr.ac.cr/',
    logo: {
      src: '/images/ROSAC/acknowledgments/eit.webp',
      alt: 'Logo de la Escuela de Ingeniería Topográfica, UCR',
    },
  },
  {
    name: 'Escuela de Ingeniería Eléctrica, UCR',
    href: 'https://eie.ucr.ac.cr',
    logo: {
      src: '/images/ROSAC/acknowledgments/eie.webp',
      alt: 'Logo de la Escuela de Ingeniería Eléctrica, UCR',
    },
  },
  {
    name: 'Recinto de Santa Cruz',
    href: 'https://www.ucr.ac.cr/directorio/recinto-universitario-de-santa-cruz/',
    logo: {
      src: '/images/ROSAC/acknowledgments/recinto-santa-cruz.webp',
      alt: 'Logo del Recinto de Santa Cruz, Universidad de Costa Rica',
    },
  },
  {
    name: 'Oficina de Servicios Generales (OSG), UCR',
    href: 'https://osg.ucr.ac.cr',
    logo: {
      src: '/images/ROSAC/acknowledgments/osg.webp',
      alt: 'Logo de la Oficina de Servicios Generales (OSG), UCR',
    },
  },
  {
    name: 'Laboratorio Nacional de Materiales y Modelos Estructurales (LanammeUCR), UCR',
    href: 'https://www.lanamme.ucr.ac.cr/',
    logo: {
      src: '/images/ROSAC/acknowledgments/lanamme.webp',
      alt: 'Logo del Laboratorio Nacional de Materiales y Modelos Estructurales (LanammeUCR)',
    },
  },
  {
    name: 'Radiográfica Costarricense S.A. (RACSA)',
    href: 'https://www.racsa.go.cr/',
    logo: {
      src: '/images/ROSAC/acknowledgments/racsa.webp',
      alt: 'Logo de Radiográfica Costarricense S.A. (RACSA)',
    },
  },
  {
    name: 'Bomberos de Costa Rica',
    href: 'https://www.bomberos.go.cr',
    logo: {
      src: '/images/ROSAC/acknowledgments/bomberos-costa-rica.webp',
      alt: 'Logo de Bomberos de Costa Rica',
    },
  },
  {
    name: 'Instituto Geográfico Nacional',
    href: 'https://www.snitcr.go.cr/ign_ign',
    logo: {
      src: '/images/ROSAC/acknowledgments/instituto-geografico-nacional.webp',
      alt: 'Logo del Instituto Geográfico Nacional, Registro Nacional de Costa Rica',
    },
  },
  {
    name: 'INDI CR',
    href: 'https://www.indicr.com/',
    logo: {
      src: '/images/ROSAC/acknowledgments/indi.webp',
      alt: 'Logo de INDI, Ingeniería y Diseño',
    },
  },
  {
    // No confirmed URL yet — renders as a plain, non-interactive tile until one is supplied.
    name: 'Prysmian Group',
    logo: {
      src: '/images/ROSAC/acknowledgments/prysmian-group.webp',
      alt: 'Logo de Prysmian Group',
    },
  },
  {
    name: 'EATON Costa Rica',
    href: 'https://www.eaton.com/cr/es-mx/company.html',
    logo: {
      src: '/images/ROSAC/acknowledgments/eaton.webp',
      alt: 'Logo de EATON Costa Rica',
    },
  },
  {
    name: 'Instituto Nacional de Astrofísica, Óptica y Electrónica (INAOE), México',
    href: 'https://www.inaoep.mx',
    logo: {
      src: '/images/ROSAC/acknowledgments/inaoe.webp',
      alt: 'Logo del Instituto Nacional de Astrofísica, Óptica y Electrónica (INAOE)',
    },
  },
  {
    name: 'Agencia Mexicana de Cooperación Internacional para el Desarrollo (AMEXCID)',
    href: 'https://www.gob.mx/amexcid',
    logo: {
      src: '/images/ROSAC/acknowledgments/amexcid.webp',
      alt: 'Logo de la Agencia Mexicana de Cooperación Internacional para el Desarrollo (AMEXCID)',
    },
  },
]

export type RosacMessages = Pick<typeof es, 'rosac'>

const personKeyBySlugOrName: Record<string, keyof typeof es.rosac.team.people> = {
  'carolina-salas': 'carolinaSalas',
  'miguel-velazquez': 'miguelVelazquez',
  'david-gale': 'davidGale',
  'oscar-nunez': 'oscarNunez',
  'federico-ruiz': 'federicoRuiz',
  'gustavo-lara': 'gustavoLara',
  'andres-fallas': 'andresFallas',
  'wagner-mejias': 'wagnerMejias',
  'eduardo-ibarra': 'eduardoIbarra',
  'andres-corrales': 'andresCorrales',
  'andres-gamboa': 'andresGamboa',
  'jelmuth-rojas': 'jelmuthRojas',
  'barnald-bocker': 'barnaldBocker',
  'fabian-chaverri': 'fabianChaverri',
  'dra. carolina salas matamoros': 'carolinaSalas',
  'dr. miguel velázquez': 'miguelVelazquez',
  'dr. david gale': 'davidGale',
  'dr. óscar núñez': 'oscarNunez',
  'dr. oscar nunez': 'oscarNunez',
  'dr. federico ruiz': 'federicoRuiz',
  'msc. gustavo lara': 'gustavoLara',
  'ing. andrés fallas': 'andresFallas',
  'ing. andres fallas': 'andresFallas',
  'msc. wagner mejías': 'wagnerMejias',
  'msc. wagner mejias': 'wagnerMejias',
  'dr. eduardo ibarra': 'eduardoIbarra',
  'ing. andrés corrales': 'andresCorrales',
  'ing. andres corrales': 'andresCorrales',
  'ing. andrés gamboa': 'andresGamboa',
  'ing. andres gamboa': 'andresGamboa',
  'jelmuth rojas': 'jelmuthRojas',
  'barnald bocker': 'barnaldBocker',
  'msc. fabián chaverri': 'fabianChaverri',
  'msc. fabian chaverri': 'fabianChaverri',
}

export function localizeResearchers(
  people: readonly TeamMember[],
  locale: string = 'es',
  messages?: RosacMessages,
): TeamMember[] {
  if (locale === 'es') {
    return [...people]
  }

  const peopleMessages = messages?.rosac?.team?.people ?? es.rosac.team.people
  if (!peopleMessages) return [...people]

  return people.map((person) => {
    const key =
      personKeyBySlugOrName[person.id] ?? personKeyBySlugOrName[person.name.toLowerCase().trim()]

    if (!key) return { ...person, contentLang: 'es' }

    const translation = peopleMessages[key]
    if (!translation) return { ...person, contentLang: 'es' }

    const storedRole = person.storedRole ?? person.role
    const storedDescription =
      person.storedDescription !== undefined
        ? person.storedDescription
        : (person.description ?? null)

    return {
      ...person,
      storedRole,
      storedDescription,
      role: translation.role ?? person.role,
      description: translation.description ?? person.description,
      contentLang: 'en',
    }
  })
}

export function getRosacInfoContent(messages: RosacMessages): RosacInfoContent {
  const rosac = messages?.rosac ?? es.rosac
  const hero = rosac.hero ?? es.rosac.hero
  const overview = rosac.overview ?? es.rosac.overview
  const characteristics = rosac.characteristics ?? es.rosac.characteristics
  const location = rosac.location ?? es.rosac.location
  const activities = rosac.activities ?? es.rosac.activities
  const radioObservation = rosac.radioObservation ?? es.rosac.radioObservation
  const relationship = rosac.relationship ?? es.rosac.relationship
  const team = rosac.team ?? es.rosac.team
  const donations = rosac.donations ?? es.rosac.donations
  const acknowledgments = rosac.acknowledgments ?? es.rosac.acknowledgments
  const backLink = rosac.backLink ?? es.rosac.backLink

  const isEnglish = (team.title ?? es.rosac.team.title) === 'Researchers'
  const teamLocale = isEnglish ? 'en' : 'es'

  return {
    construction: getRosacConstructionContent(messages),
    instruments: getRosacInstrumentsContent(messages),
    hero: {
      kicker: hero.kicker,
      title: hero.title,
      image: {
        src: '/images/ROSAC/rosac_home.jpg',
        alt: hero.imageAlt,
        presentation: 'banner',
        width: 1672,
        height: 580,
        focus: 'center',
        mobileSrc: '/images/ROSAC/rosac_home_mob.png',
      },
    },
    overview: {
      title: overview.title,
      paragraphs: [overview.p1, overview.p2],
    },
    characteristics: {
      title: characteristics.title,
      items: [
        {
          id: 'antenna',
          icon: 'antenna',
          title: characteristics.items.antenna.title,
          description: characteristics.items.antenna.description,
        },
        {
          id: 'location',
          icon: 'location',
          title: characteristics.items.location.title,
          description: characteristics.items.location.description,
        },
        {
          id: 'frequencies',
          icon: 'frequency',
          title: characteristics.items.frequencies.title,
          description: characteristics.items.frequencies.description,
        },
        {
          id: 'sources',
          icon: 'sun',
          title: characteristics.items.sources.title,
          description: characteristics.items.sources.description,
        },
      ],
    },
    location: {
      title: location.title,
      intro: location.intro.replace('{address}', rosacLocationAddress),
      address: rosacLocationAddress,
      coordinates: { latitude: 10.2840093, longitude: -85.5959871 },
      zoom: 16,
      tileUrl: locationMapProvider.tileUrl,
      attribution: locationMapProvider.attribution,
      loadTimeoutMs: locationMapProvider.loadTimeoutMs,
      markerLabel: location.markerLabel,
      unavailableMessage: location.unavailableMessage,
      labels: {
        regionName: (location.mapRegion ?? es.rosac.location.mapRegion).replace(
          '{label}',
          location.markerLabel,
        ),
        interactiveName: (location.mapInteractive ?? es.rosac.location.mapInteractive).replace(
          '{label}',
          location.markerLabel,
        ),
        instructions: location.mapInstructions ?? es.rosac.location.mapInstructions,
        zoomInTitle: location.zoomIn ?? es.rosac.location.zoomIn,
        zoomOutTitle: location.zoomOut ?? es.rosac.location.zoomOut,
      },
    },
    activities: {
      title: activities.title,
      items: [
        {
          id: 'tracking',
          icon: 'tracking',
          title: activities.items.tracking.title,
          description: activities.items.tracking.description,
        },
        {
          id: 'observations',
          icon: 'sun',
          title: activities.items.observations.title,
          description: activities.items.observations.description,
        },
        {
          id: 'control',
          icon: 'control',
          title: activities.items.control.title,
          description: activities.items.control.description,
        },
        {
          id: 'receivers',
          icon: 'receiver',
          title: activities.items.receivers.title,
          description: activities.items.receivers.description,
        },
        {
          id: 'infrastructure',
          icon: 'maintenance',
          title: activities.items.infrastructure.title,
          description: activities.items.infrastructure.description,
        },
        {
          id: 'education',
          icon: 'education',
          title: activities.items.education.title,
          description: activities.items.education.description,
        },
      ],
    },
    radioObservation: {
      title: radioObservation.title,
      paragraphs: [radioObservation.p1],
    },
    relationship: {
      title: relationship.title,
      paragraphs: [relationship.p1, relationship.p2],
    },
    team: {
      title: team.title,
      intro: team.intro,
      hint: team.hint,
      emptyMessage: team.emptyMessage,
      institutionLabel: (team as { institutionLabel?: string }).institutionLabel ?? 'Institución',
      people: localizeResearchers(defaultTeamPeople, teamLocale, messages),
    },
    acknowledgments: {
      title: acknowledgments.title,
      subtitle: acknowledgments.subtitle,
      institutions: rosacInstitutions,
    },
    donations: {
      title: donations.title,
      subtitle: donations.subtitle,
      items: [
        {
          title: donations.items.eaton.title,
          description: donations.items.eaton.description,
          image: {
            src: '/images/ROSAC/donations/eaton.webp',
            alt: donations.items.eaton.imageAlt,
          },
        },
        {
          title: donations.items.prysmian.title,
          description: donations.items.prysmian.description,
          image: {
            src: '/images/ROSAC/donations/prysmian.webp',
            alt: donations.items.prysmian.imageAlt,
          },
        },
      ],
      cta: {
        title: donations.cta.title,
        description: donations.cta.description,
        buttonLabel: donations.cta.buttonLabel,
        href: '/contacto',
      },
    },
    backLink: {
      href: '/#areas-de-trabajo',
      label: backLink.label,
    },
  }
}

export const rosacInfoContent = getRosacInfoContent(es)

/**
 * The ROSAC researcher profiles (LASCE-CON-012-085), persisted in
 * `researchers` — the only part of the ROSAC page backed by Postgres so far.
 * Rows map directly onto `TeamMember` (the DB's `photo_url` becomes `src`),
 * so `getResearchers()` can be dropped straight into `TeamGallery` with no
 * extra adapter.
 */
type ResearcherRow = {
  id: string
  photoUrl: string | null
  role: string
  name: string
  institution: string
  email: string[]
  description: string | null
}

function toTeamMember(row: ResearcherRow): TeamMember {
  return {
    id: row.id,
    // A researcher without a photo is stored as `null` and reaches the UI as `''`, the same
    // "no photo" value `ResearcherForm` uses.
    src: row.photoUrl ?? '',
    role: row.role,
    name: row.name,
    institution: row.institution,
    email: row.email.length > 0 ? row.email : undefined,
    description: row.description ?? undefined,
  }
}

export async function getResearchers(): Promise<TeamMember[]> {
  const rows = await prisma.researcher.findMany({ orderBy: { createdAt: 'asc' } })
  return rows.map(toTeamMember)
}

/** `''` and `undefined` both mean "not set" — stored as `null`, same as an untouched row. */
function normalizeOptional(value: string | undefined): string | null {
  return value ? value : null
}

/**
 * Shared by create and update. `email` is a single form field — a comma
 * separated list of zero, one or two addresses — split and validated into an
 * array here, since a researcher can have more than one (LASCE-CON-012-085
 * follow-up, matching `ResearcherCard`'s multi-address display). Capped at 2
 * by both this schema and a database CHECK constraint.
 */
export const researcherInputSchema = z.object({
  /** Optional: `''` or a missing value means the researcher has no photo. */
  src: z.string().trim().optional(),
  role: z.string().trim().min(1, 'El rol es obligatorio.'),
  name: z.string().trim().min(1, 'El nombre es obligatorio.'),
  email: z
    .string()
    .trim()
    .transform((value) =>
      value === ''
        ? []
        : value
            .split(',')
            .map((address) => address.trim())
            .filter((address) => address !== ''),
    )
    .pipe(
      z
        .array(z.email({ error: 'Uno o más correos no son válidos.' }))
        .max(2, 'Máximo 2 correos de contacto.'),
    )
    .optional(),
  institution: z.string().trim().min(1, 'La institución es obligatoria.'),
  description: z.string().trim().optional(),
})

export type ResearcherInput = z.infer<typeof researcherInputSchema>

/**
 * Creates a new researcher profile, authored by the admin who submitted it.
 * `createdAt` defaults to now, which — since the list is ordered by it —
 * puts the new profile at the end. The add card itself stays at the front of the gallery.
 */
export async function createResearcher(
  data: ResearcherInput,
  modifiedBy: string,
): Promise<TeamMember> {
  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.researcher.create({
      data: {
        photoUrl: normalizeOptional(data.src),
        role: data.role,
        name: data.name,
        email: data.email ?? [],
        institution: data.institution,
        description: normalizeOptional(data.description),
        modifiedBy,
      },
    })
    await recordUserAuditEvent(
      tx,
      { id: modifiedBy },
      {
        action: 'rosac_researcher.create',
        summary: `Investigador ROSAC agregado: ${created.name}`,
        entityType: 'rosac_researcher',
        entityId: created.id,
      },
    )
    return created
  })

  return toTeamMember(row)
}

/**
 * Updates one researcher profile and stamps `modifiedBy` with the admin who
 * made the change. Returns `null` when `id` does not match any row, rather
 * than throwing, so the route handler can turn that into a 404.
 */
export async function updateResearcher(
  id: string,
  data: ResearcherInput,
  modifiedBy: string,
): Promise<TeamMember | null> {
  const row = await prisma.$transaction(async (tx) => {
    const existing = await tx.researcher.findUnique({ where: { id } })
    if (!existing) return null

    const updated = await tx.researcher.update({
      where: { id },
      data: {
        photoUrl: normalizeOptional(data.src),
        role: data.role,
        name: data.name,
        email: data.email ?? [],
        institution: data.institution,
        description: normalizeOptional(data.description),
        modifiedBy,
      },
    })
    await recordUserAuditEvent(
      tx,
      { id: modifiedBy },
      {
        action: 'rosac_researcher.update',
        summary: `Investigador ROSAC actualizado: ${updated.name}`,
        entityType: 'rosac_researcher',
        entityId: id,
        metadata: { fields: changedFieldNames(data) },
      },
    )
    return updated
  })

  return row ? toTeamMember(row) : null
}

/**
 * Deletes one researcher profile. Returns `false` when `id` does not match
 * any row, rather than throwing, so the route handler can turn that into a
 * 404 — same pre-check pattern as `updateResearcher`.
 */
export async function deleteResearcher(id: string, actor: AuditActor): Promise<boolean> {
  return runAuditedDelete(
    (tx) => tx.researcher.findUnique({ where: { id }, select: { name: true } }),
    (tx) => tx.researcher.deleteMany({ where: { id } }),
    (tx, researcher) =>
      recordUserAuditEvent(tx, actor, {
        action: 'rosac_researcher.delete',
        summary: `Investigador ROSAC eliminado: ${researcher.name}`,
        entityType: 'rosac_researcher',
        entityId: id,
      }),
  )
}

export const rosacCharacteristicContent = defineTranslatableContent({
  title: { noun: { word: 'título', gender: 'm' }, nouns: { en: 'title' }, required: true },
  description: {
    noun: { word: 'descripción', gender: 'f' },
    nouns: { en: 'description' },
    required: true,
  },
})

export type StoredRosacCharacteristicContent = StoredContent<
  typeof rosacCharacteristicContent.specs
>

export type RosacCharacteristicField = FieldOf<typeof rosacCharacteristicContent.specs>

export interface RosacCharacteristicEditingData {
  content: StoredRosacCharacteristicContent
  isLegacy: boolean
  version: string
}

export interface RosacCharacteristicItem {
  id: string
  icon: RosacCardIcon
  title: string
  description: string
  editing?: RosacCharacteristicEditingData
}

export const rosacCharacteristicInputSchema = z
  .object({
    version: versionSchema(
      'La versión de la característica es obligatoria y debe ser la que se cargó.',
    ).optional(),
    icon: z
      .enum([
        'antenna',
        'location',
        'frequency',
        'sun',
        'tracking',
        'control',
        'receiver',
        'maintenance',
        'education',
      ])
      .optional(),
    title: z.string().trim().min(1, 'El título es obligatorio.').optional(),
    description: z.string().trim().min(1, 'La descripción es obligatoria.').optional(),
    content: rosacCharacteristicContent.schema.optional(),
    confirmedUnchanged: rosacCharacteristicContent.confirmationsSchema.optional(),
  })
  .refine((data) => (data.title && data.description) || data.content, {
    message: 'El título y la descripción son obligatorios.',
  })

export type RosacCharacteristicInput = z.infer<typeof rosacCharacteristicInputSchema>

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function getRosacCharacteristics(
  locale: Locale = defaultLocale,
  { includeEditingData = false }: { includeEditingData?: boolean } = {},
): Promise<RosacCharacteristicItem[]> {
  const rows = await prisma.rosacCharacteristic.findMany({
    orderBy: { position: 'asc' },
    include: { translations: true },
  })
  return rows.map((r) => {
    const stored = storedContentFrom(
      rosacCharacteristicContent,
      { title: r.title, description: r.description },
      r.translations.map((t) => ({
        locale: t.locale,
        title: t.title,
        description: t.description,
      })),
    )
    const { content: shown, isLegacy } = resolveContent(stored, locale)
    return {
      id: r.key,
      icon: r.icon as RosacCardIcon,
      title: shown.title,
      description: shown.description,
      ...(includeEditingData
        ? {
            editing: {
              content: stored,
              isLegacy,
              version: toVersion(r.updatedAt),
            },
          }
        : {}),
    }
  })
}

export async function updateRosacCharacteristic(
  keyOrId: string,
  data: RosacCharacteristicInput,
): Promise<RosacCharacteristicItem | null> {
  const isUuid = UUID_REGEX.test(keyOrId)
  const existing = await prisma.rosacCharacteristic.findFirst({
    where: isUuid ? { id: keyOrId } : { key: keyOrId },
    include: { translations: true },
  })
  if (!existing) return null

  if (data.version) {
    const expected = parseVersion(data.version)
    if (!isCurrentVersion(existing.updatedAt, expected)) {
      throw new RosacConflictError(
        'La característica cambió desde que la abrió. Recárguela y vuelva a aplicar sus cambios.',
      )
    }
  }

  let esTitle = data.title ?? existing.title
  let esDesc = data.description ?? existing.description
  let enTitle: string | undefined
  let enDesc: string | undefined

  if (data.content) {
    const storedCurrent = storedContentFrom(
      rosacCharacteristicContent,
      { title: existing.title, description: existing.description },
      existing.translations.map((t) => ({
        locale: t.locale,
        title: t.title,
        description: t.description,
      })),
    )
    const pending = findPendingReviews(
      rosacCharacteristicContent,
      storedCurrent,
      data.content,
      data.confirmedUnchanged ?? [],
    )
    if (pending.length > 0) {
      throw new RosacReviewRequiredError(pending)
    }

    const base = baseContent(rosacCharacteristicContent, data.content)
    esTitle = base.title
    esDesc = base.description
    const en = data.content.en
    if (en) {
      enTitle = en.title
      enDesc = en.description
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (data.version) {
      const expected = parseVersion(data.version)
      const { count } = await tx.rosacCharacteristic.updateMany({
        where: { id: existing.id, updatedAt: expected },
        data: {
          icon: data.icon,
          title: esTitle,
          description: esDesc,
          updatedAt: nextUpdatedAt(expected),
        },
      })
      if (count === 0) {
        throw new RosacConflictError(
          'La característica cambió desde que la abrió. Recárguela y vuelva a aplicar sus cambios.',
        )
      }
    } else {
      await tx.rosacCharacteristic.update({
        where: { id: existing.id },
        data: {
          icon: data.icon,
          title: esTitle,
          description: esDesc,
        },
      })
    }

    if (enTitle !== undefined && enDesc !== undefined) {
      await tx.rosacCharacteristicTranslation.upsert({
        where: {
          characteristicId_locale: { characteristicId: existing.id, locale: 'en' },
        },
        update: { title: enTitle, description: enDesc },
        create: {
          characteristicId: existing.id,
          locale: 'en',
          title: enTitle,
          description: enDesc,
        },
      })
    }

    return tx.rosacCharacteristic.findUnique({
      where: { id: existing.id },
      include: { translations: true },
    })
  })

  if (!updated) return null

  const stored = storedContentFrom(
    rosacCharacteristicContent,
    { title: updated.title, description: updated.description },
    updated.translations.map((t) => ({
      locale: t.locale,
      title: t.title,
      description: t.description,
    })),
  )
  const { content: shown, isLegacy } = resolveContent(stored, defaultLocale)

  return {
    id: updated.key,
    icon: updated.icon as RosacCardIcon,
    title: shown.title,
    description: shown.description,
    editing: {
      content: stored,
      isLegacy,
      version: toVersion(updated.updatedAt),
    },
  }
}

// --- Section 3: Activities ---

export const rosacActivityContent = defineTranslatableContent({
  title: { noun: { word: 'título', gender: 'm' }, nouns: { en: 'title' }, required: true },
  description: {
    noun: { word: 'descripción', gender: 'f' },
    nouns: { en: 'description' },
    required: true,
  },
})

export type StoredRosacActivityContent = StoredContent<typeof rosacActivityContent.specs>

export type RosacActivityField = FieldOf<typeof rosacActivityContent.specs>

export interface RosacActivityEditingData {
  content: StoredRosacActivityContent
  isLegacy: boolean
  version: string
}

export interface RosacActivityItem {
  id: string
  icon: RosacCardIcon
  title: string
  description: string
  editing?: RosacActivityEditingData
}

export const rosacActivityInputSchema = z
  .object({
    version: versionSchema(
      'La versión de la actividad es obligatoria y debe ser la que se cargó.',
    ).optional(),
    icon: z
      .enum([
        'antenna',
        'location',
        'frequency',
        'sun',
        'tracking',
        'control',
        'receiver',
        'maintenance',
        'education',
      ])
      .optional(),
    title: z.string().trim().min(1, 'El título es obligatorio.').optional(),
    description: z.string().trim().min(1, 'La descripción es obligatoria.').optional(),
    content: rosacActivityContent.schema.optional(),
    confirmedUnchanged: rosacActivityContent.confirmationsSchema.optional(),
  })
  .refine((data) => (data.title && data.description) || data.content, {
    message: 'El título y la descripción son obligatorios.',
  })

export type RosacActivityInput = z.infer<typeof rosacActivityInputSchema>

export async function getRosacActivities(
  locale: Locale = defaultLocale,
  { includeEditingData = false }: { includeEditingData?: boolean } = {},
): Promise<RosacActivityItem[]> {
  const rows = await prisma.rosacActivity.findMany({
    orderBy: { position: 'asc' },
    include: { translations: true },
  })
  return rows.map((r) => {
    const stored = storedContentFrom(
      rosacActivityContent,
      { title: r.title, description: r.description },
      r.translations.map((t) => ({
        locale: t.locale,
        title: t.title,
        description: t.description,
      })),
    )
    const { content: shown, isLegacy } = resolveContent(stored, locale)
    return {
      id: r.key,
      icon: r.icon as RosacCardIcon,
      title: shown.title,
      description: shown.description,
      ...(includeEditingData
        ? {
            editing: {
              content: stored,
              isLegacy,
              version: toVersion(r.updatedAt),
            },
          }
        : {}),
    }
  })
}

export async function updateRosacActivity(
  keyOrId: string,
  data: RosacActivityInput,
): Promise<RosacActivityItem | null> {
  const isUuid = UUID_REGEX.test(keyOrId)
  const existing = await prisma.rosacActivity.findFirst({
    where: isUuid ? { id: keyOrId } : { key: keyOrId },
    include: { translations: true },
  })
  if (!existing) return null

  if (data.version) {
    const expected = parseVersion(data.version)
    if (!isCurrentVersion(existing.updatedAt, expected)) {
      throw new RosacConflictError(
        'La actividad cambió desde que la abrió. Recárguela y vuelva a aplicar sus cambios.',
      )
    }
  }

  let esTitle = data.title ?? existing.title
  let esDesc = data.description ?? existing.description
  let enTitle: string | undefined
  let enDesc: string | undefined

  if (data.content) {
    const storedCurrent = storedContentFrom(
      rosacActivityContent,
      { title: existing.title, description: existing.description },
      existing.translations.map((t) => ({
        locale: t.locale,
        title: t.title,
        description: t.description,
      })),
    )
    const pending = findPendingReviews(
      rosacActivityContent,
      storedCurrent,
      data.content,
      data.confirmedUnchanged ?? [],
    )
    if (pending.length > 0) {
      throw new RosacReviewRequiredError(pending)
    }

    const base = baseContent(rosacActivityContent, data.content)
    esTitle = base.title
    esDesc = base.description
    const en = data.content.en
    if (en) {
      enTitle = en.title
      enDesc = en.description
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (data.version) {
      const expected = parseVersion(data.version)
      const { count } = await tx.rosacActivity.updateMany({
        where: { id: existing.id, updatedAt: expected },
        data: {
          icon: data.icon,
          title: esTitle,
          description: esDesc,
          updatedAt: nextUpdatedAt(expected),
        },
      })
      if (count === 0) {
        throw new RosacConflictError(
          'La actividad cambió desde que la abrió. Recárguela y vuelva a aplicar sus cambios.',
        )
      }
    } else {
      await tx.rosacActivity.update({
        where: { id: existing.id },
        data: {
          icon: data.icon,
          title: esTitle,
          description: esDesc,
        },
      })
    }

    if (enTitle !== undefined && enDesc !== undefined) {
      await tx.rosacActivityTranslation.upsert({
        where: {
          activityId_locale: { activityId: existing.id, locale: 'en' },
        },
        update: { title: enTitle, description: enDesc },
        create: {
          activityId: existing.id,
          locale: 'en',
          title: enTitle,
          description: enDesc,
        },
      })
    }

    return tx.rosacActivity.findUnique({
      where: { id: existing.id },
      include: { translations: true },
    })
  })

  if (!updated) return null

  const stored = storedContentFrom(
    rosacActivityContent,
    { title: updated.title, description: updated.description },
    updated.translations.map((t) => ({
      locale: t.locale,
      title: t.title,
      description: t.description,
    })),
  )
  const { content: shown, isLegacy } = resolveContent(stored, defaultLocale)

  return {
    id: updated.key,
    icon: updated.icon as RosacCardIcon,
    title: shown.title,
    description: shown.description,
    editing: {
      content: stored,
      isLegacy,
      version: toVersion(updated.updatedAt),
    },
  }
}

// --- Section 4: Construction Stages ---

export const rosacStageContent = defineTranslatableContent({
  title: { noun: { word: 'título', gender: 'm' }, nouns: { en: 'title' }, required: true },
  description: {
    noun: { word: 'descripción', gender: 'f' },
    nouns: { en: 'description' },
    required: true,
  },
})

export type StoredRosacStageContent = StoredContent<typeof rosacStageContent.specs>

export type RosacStageField = FieldOf<typeof rosacStageContent.specs>

export interface RosacStageEditingData {
  content: StoredRosacStageContent
  isLegacy: boolean
  version: string
}

export const rosacStageInputSchema = z
  .object({
    version: versionSchema(
      'La versión de la etapa es obligatoria y debe ser la que se cargó.',
    ).optional(),
    title: z.string().trim().min(1, 'El título es obligatorio.').optional(),
    description: z.string().trim().min(1, 'La descripción es obligatoria.').optional(),
    images: z
      .array(
        z.object({
          src: z.string().trim().min(1),
          alt: z.string().trim().min(1),
        }),
      )
      .optional(),
    content: rosacStageContent.schema.optional(),
    confirmedUnchanged: rosacStageContent.confirmationsSchema.optional(),
  })
  .refine((data) => (data.title && data.description) || data.content, {
    message: 'El título y la descripción son obligatorios.',
  })

export type RosacStageInput = z.infer<typeof rosacStageInputSchema>

export async function getRosacStages(
  locale: Locale = defaultLocale,
  { includeEditingData = false }: { includeEditingData?: boolean } = {},
): Promise<ConstructionStage[]> {
  const rows = await prisma.rosacStage.findMany({
    orderBy: { position: 'asc' },
    include: { translations: true },
  })
  return rows.map((r) => {
    const stored = storedContentFrom(
      rosacStageContent,
      { title: r.title, description: r.description },
      r.translations.map((t) => ({
        locale: t.locale,
        title: t.title,
        description: t.description,
      })),
    )
    const { content: shown, isLegacy } = resolveContent(stored, locale)
    return {
      id: r.key,
      title: shown.title,
      navigationLabel: shown.title,
      description: shown.description,
      images: (r.images as unknown as ConstructionImage[]) ?? [],
      ...(includeEditingData
        ? {
            editing: {
              content: stored,
              isLegacy,
              version: toVersion(r.updatedAt),
            },
          }
        : {}),
    } as unknown as ConstructionStage
  })
}

export async function updateRosacStage(
  keyOrId: string,
  data: RosacStageInput,
): Promise<ConstructionStage | null> {
  const isUuid = UUID_REGEX.test(keyOrId)
  const existing = await prisma.rosacStage.findFirst({
    where: isUuid ? { id: keyOrId } : { key: keyOrId },
    include: { translations: true },
  })
  if (!existing) return null

  if (data.version) {
    const expected = parseVersion(data.version)
    if (!isCurrentVersion(existing.updatedAt, expected)) {
      throw new RosacConflictError(
        'La etapa cambió desde que la abrió. Recárguela y vuelva a aplicar sus cambios.',
      )
    }
  }

  let esTitle = data.title ?? existing.title
  let esDesc = data.description ?? existing.description
  let enTitle: string | undefined
  let enDesc: string | undefined

  if (data.content) {
    const storedCurrent = storedContentFrom(
      rosacStageContent,
      { title: existing.title, description: existing.description },
      existing.translations.map((t) => ({
        locale: t.locale,
        title: t.title,
        description: t.description,
      })),
    )
    const pending = findPendingReviews(
      rosacStageContent,
      storedCurrent,
      data.content,
      data.confirmedUnchanged ?? [],
    )
    if (pending.length > 0) {
      throw new RosacReviewRequiredError(pending)
    }

    const base = baseContent(rosacStageContent, data.content)
    esTitle = base.title
    esDesc = base.description
    const en = data.content.en
    if (en) {
      enTitle = en.title
      enDesc = en.description
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (data.version) {
      const expected = parseVersion(data.version)
      const { count } = await tx.rosacStage.updateMany({
        where: { id: existing.id, updatedAt: expected },
        data: {
          title: esTitle,
          description: esDesc,
          ...(data.images ? { images: data.images as unknown as Prisma.InputJsonValue } : {}),
          updatedAt: nextUpdatedAt(expected),
        },
      })
      if (count === 0) {
        throw new RosacConflictError(
          'La etapa cambió desde que la abrió. Recárguela y vuelva a aplicar sus cambios.',
        )
      }
    } else {
      await tx.rosacStage.update({
        where: { id: existing.id },
        data: {
          title: esTitle,
          description: esDesc,
          ...(data.images ? { images: data.images as unknown as Prisma.InputJsonValue } : {}),
        },
      })
    }

    if (enTitle !== undefined && enDesc !== undefined) {
      await tx.rosacStageTranslation.upsert({
        where: {
          stageId_locale: { stageId: existing.id, locale: 'en' },
        },
        update: { title: enTitle, description: enDesc },
        create: {
          stageId: existing.id,
          locale: 'en',
          title: enTitle,
          description: enDesc,
        },
      })
    }

    return tx.rosacStage.findUnique({
      where: { id: existing.id },
      include: { translations: true },
    })
  })

  if (!updated) return null

  const stored = storedContentFrom(
    rosacStageContent,
    { title: updated.title, description: updated.description },
    updated.translations.map((t) => ({
      locale: t.locale,
      title: t.title,
      description: t.description,
    })),
  )
  const { content: shown, isLegacy } = resolveContent(stored, defaultLocale)

  return {
    id: updated.key,
    title: shown.title,
    navigationLabel: shown.title,
    description: shown.description,
    images: (updated.images as unknown as ConstructionImage[]) ?? [],
    editing: {
      content: stored,
      isLegacy,
      version: toVersion(updated.updatedAt),
    },
  } as unknown as ConstructionStage
}

// --- Section 6: Instruments ---

export const rosacInstrumentContent = defineTranslatableContent({
  name: { noun: { word: 'nombre', gender: 'm' }, nouns: { en: 'name' }, required: true },
  description: {
    noun: { word: 'descripción', gender: 'f' },
    nouns: { en: 'description' },
    required: true,
  },
})

export type StoredRosacInstrumentContent = StoredContent<typeof rosacInstrumentContent.specs>

export type RosacInstrumentField = FieldOf<typeof rosacInstrumentContent.specs>

export interface RosacInstrumentEditingData {
  content: StoredRosacInstrumentContent
  isLegacy: boolean
  version: string
}

export const safeUrlSchema = z
  .string()
  .trim()
  .refine(
    (val) => {
      if (!val) return true
      if (val.startsWith('/') && !val.startsWith('//')) return true
      try {
        const parsed = new URL(val)
        return (
          (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
          !parsed.username &&
          !parsed.password
        )
      } catch {
        return false
      }
    },
    { message: 'La URL debe ser una dirección web válida (http/https) o una ruta relativa.' },
  )

export const rosacInstrumentInputSchema = z
  .object({
    version: versionSchema(
      'La versión del instrumento es obligatoria y debe ser la que se cargó.',
    ).optional(),
    name: z.string().trim().min(1, 'El nombre es obligatorio.').optional(),
    pendingMessage: z.string().trim().optional(),
    image: z
      .object({
        src: z.string().trim().min(1),
        alt: z.string().trim().min(1),
      })
      .optional(),
    consultation: z
      .object({
        href: safeUrlSchema.optional(),
        label: z.string().trim().min(1),
        notice: z.string().trim().optional(),
      })
      .optional(),
    content: rosacInstrumentContent.schema.optional(),
    confirmedUnchanged: rosacInstrumentContent.confirmationsSchema.optional(),
  })
  .refine((data) => data.name || data.content, {
    message: 'El nombre es obligatorio.',
  })

export type RosacInstrumentInput = z.infer<typeof rosacInstrumentInputSchema>

export async function getRosacInstruments(
  locale: Locale = defaultLocale,
  { includeEditingData = false }: { includeEditingData?: boolean } = {},
): Promise<RosacInstrumentCardContent[]> {
  const rows = await prisma.rosacInstrument.findMany({
    orderBy: { position: 'asc' },
    include: { translations: true },
  })
  return rows.map((r) => {
    const stored = storedContentFrom(
      rosacInstrumentContent,
      {
        name: r.name,
        description: r.consultationNotice ?? r.pendingMessage ?? '',
      },
      r.translations.map((t) => ({
        locale: t.locale,
        name: t.name,
        description: t.consultationNotice ?? t.pendingMessage ?? '',
      })),
    )
    const { content: shown, isLegacy } = resolveContent(stored, locale)
    return {
      id: r.id,
      name: shown.name,
      pendingMessage: shown.description || undefined,
      image: r.imageSrc ? { src: r.imageSrc, alt: r.imageAlt ?? '' } : undefined,
      consultation: r.consultationLabel
        ? {
            href: r.consultationHref ?? undefined,
            label: r.consultationLabel,
            notice: shown.description || undefined,
          }
        : undefined,
      ...(includeEditingData
        ? {
            editing: {
              content: stored,
              isLegacy,
              version: toVersion(r.updatedAt),
            },
          }
        : {}),
    }
  })
}

export async function createRosacInstrument(
  data: RosacInstrumentInput,
): Promise<RosacInstrumentCardContent> {
  const maxPosition = await prisma.rosacInstrument.aggregate({
    _max: { position: true },
  })
  const nextPosition = (maxPosition._max.position ?? -1) + 1

  let esName = data.name ?? ''
  let esDesc = data.pendingMessage || data.consultation?.notice || null
  let esLabel = data.consultation?.label || data.name || ''

  let enName: string | undefined
  let enDesc: string | null | undefined

  if (data.content) {
    const base = baseContent(rosacInstrumentContent, data.content)
    esName = base.name
    esDesc = base.description || null
    esLabel = data.consultation?.label || base.name

    const en = data.content.en
    if (en) {
      enName = en.name
      enDesc = en.description || null
    }
  }

  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.rosacInstrument.create({
      data: {
        name: esName,
        pendingMessage: esDesc,
        imageSrc: data.image?.src || null,
        imageAlt: data.image?.alt || null,
        consultationHref: data.consultation?.href || null,
        consultationLabel: esLabel,
        consultationNotice: esDesc,
        position: nextPosition,
      },
    })

    if (enName) {
      await tx.rosacInstrumentTranslation.create({
        data: {
          instrumentId: created.id,
          locale: 'en',
          name: enName,
          pendingMessage: enDesc,
          consultationLabel: null,
          consultationNotice: enDesc,
          imageAlt: data.image?.alt || null,
        },
      })
    }

    return tx.rosacInstrument.findUnique({
      where: { id: created.id },
      include: { translations: true },
    })
  })

  if (!row) throw new Error('No se pudo crear el instrumento')

  const stored = storedContentFrom(
    rosacInstrumentContent,
    {
      name: row.name,
      description: row.consultationNotice ?? row.pendingMessage ?? '',
    },
    row.translations.map((t) => ({
      locale: t.locale,
      name: t.name,
      description: t.consultationNotice ?? t.pendingMessage ?? '',
    })),
  )
  const { content: shown, isLegacy } = resolveContent(stored, defaultLocale)

  return {
    id: row.id,
    name: shown.name,
    pendingMessage: shown.description ?? undefined,
    image: row.imageSrc ? { src: row.imageSrc, alt: row.imageAlt ?? '' } : undefined,
    consultation: row.consultationLabel
      ? {
          href: row.consultationHref ?? undefined,
          label: row.consultationLabel,
          notice: shown.description ?? undefined,
        }
      : undefined,
    editing: {
      content: stored,
      isLegacy,
      version: toVersion(row.updatedAt),
    },
  }
}

export async function updateRosacInstrument(
  id: string,
  data: RosacInstrumentInput,
): Promise<RosacInstrumentCardContent | null> {
  if (!UUID_REGEX.test(id)) return null
  const existing = await prisma.rosacInstrument.findUnique({
    where: { id },
    include: { translations: true },
  })

  if (!existing) return null

  if (data.version) {
    const expected = parseVersion(data.version)
    if (!isCurrentVersion(existing.updatedAt, expected)) {
      throw new RosacConflictError(
        'El instrumento cambió desde que lo abrió. Recárguelo y vuelva a aplicar sus cambios.',
      )
    }
  }

  let esName = data.name ?? existing.name
  let esPending =
    data.pendingMessage !== undefined ? data.pendingMessage || null : existing.pendingMessage
  let esLabel = data.consultation?.label ?? existing.consultationLabel
  let esNotice =
    data.consultation?.notice !== undefined
      ? data.consultation.notice || null
      : existing.consultationNotice
  const esAlt = data.image?.alt !== undefined ? data.image.alt || null : existing.imageAlt

  let enName: string | undefined
  let enPending: string | null | undefined
  let enLabel: string | null | undefined
  let enNotice: string | null | undefined
  let enAlt: string | null | undefined

  if (data.content) {
    const storedCurrent = storedContentFrom(
      rosacInstrumentContent,
      {
        name: existing.name,
        description: existing.consultationNotice ?? existing.pendingMessage ?? '',
      },
      existing.translations.map((t) => ({
        locale: t.locale,
        name: t.name,
        description: t.consultationNotice ?? t.pendingMessage ?? '',
      })),
    )
    const pending = findPendingReviews(
      rosacInstrumentContent,
      storedCurrent,
      data.content,
      data.confirmedUnchanged ?? [],
    )
    if (pending.length > 0) {
      throw new RosacReviewRequiredError(pending)
    }

    const base = baseContent(rosacInstrumentContent, data.content)
    esName = base.name
    esPending = base.description || null
    esNotice = base.description || null
    esLabel = data.consultation?.label ?? existing.consultationLabel

    const en = data.content.en
    if (en) {
      enName = en.name
      enPending = en.description || null
      enNotice = en.description || null
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (data.version) {
      const expected = parseVersion(data.version)
      const { count } = await tx.rosacInstrument.updateMany({
        where: { id: existing.id, updatedAt: expected },
        data: {
          name: esName,
          pendingMessage: esPending,
          imageSrc: data.image?.src !== undefined ? data.image.src || null : existing.imageSrc,
          imageAlt: esAlt,
          consultationHref:
            data.consultation?.href !== undefined
              ? data.consultation.href || null
              : existing.consultationHref,
          consultationLabel: esLabel,
          consultationNotice: esNotice,
          updatedAt: nextUpdatedAt(expected),
        },
      })
      if (count === 0) {
        throw new RosacConflictError(
          'El instrumento cambió desde que lo abrió. Recárguelo y vuelva a aplicar sus cambios.',
        )
      }
    } else {
      await tx.rosacInstrument.update({
        where: { id: existing.id },
        data: {
          name: esName,
          pendingMessage: esPending,
          imageSrc: data.image?.src !== undefined ? data.image.src || null : existing.imageSrc,
          imageAlt: esAlt,
          consultationHref:
            data.consultation?.href !== undefined
              ? data.consultation.href || null
              : existing.consultationHref,
          consultationLabel: esLabel,
          consultationNotice: esNotice,
        },
      })
    }

    if (enName) {
      await tx.rosacInstrumentTranslation.upsert({
        where: {
          instrumentId_locale: { instrumentId: existing.id, locale: 'en' },
        },
        update: {
          name: enName,
          pendingMessage: enPending,
          consultationLabel: enLabel,
          consultationNotice: enNotice,
          imageAlt: enAlt,
        },
        create: {
          instrumentId: existing.id,
          locale: 'en',
          name: enName,
          pendingMessage: enPending,
          consultationLabel: enLabel,
          consultationNotice: enNotice,
          imageAlt: enAlt,
        },
      })
    }

    return tx.rosacInstrument.findUnique({
      where: { id: existing.id },
      include: { translations: true },
    })
  })

  if (!updated) return null

  const stored = storedContentFrom(
    rosacInstrumentContent,
    {
      name: updated.name,
      description: updated.consultationNotice ?? updated.pendingMessage ?? '',
    },
    updated.translations.map((t) => ({
      locale: t.locale,
      name: t.name,
      description: t.consultationNotice ?? t.pendingMessage ?? '',
    })),
  )
  const { content: shown, isLegacy } = resolveContent(stored, defaultLocale)

  return {
    id: updated.id,
    name: shown.name,
    pendingMessage: shown.description ?? undefined,
    image: updated.imageSrc ? { src: updated.imageSrc, alt: updated.imageAlt ?? '' } : undefined,
    consultation: updated.consultationLabel
      ? {
          href: updated.consultationHref ?? undefined,
          label: updated.consultationLabel,
          notice: shown.description ?? undefined,
        }
      : undefined,
    editing: {
      content: stored,
      isLegacy,
      version: toVersion(updated.updatedAt),
    },
  }
}

export async function deleteRosacInstrument(id: string): Promise<boolean> {
  if (!UUID_REGEX.test(id)) return false
  const existing = await prisma.rosacInstrument.findUnique({
    where: { id },
  })
  if (!existing) return false
  await prisma.rosacInstrument.delete({ where: { id: existing.id } })
  return true
}

// --- Section 9: Acknowledgments ---

export const safeExternalUrlSchema = z
  .string()
  .trim()
  .refine(
    (val) => {
      if (!val) return true
      try {
        const parsed = new URL(val)
        return (
          (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
          !parsed.username &&
          !parsed.password
        )
      } catch {
        return false
      }
    },
    { message: 'La URL debe ser una dirección web válida (http/https).' },
  )

export const rosacAcknowledgmentInputSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio.'),
  href: safeExternalUrlSchema.optional(),
  logo: z.object({
    src: z.string().trim().min(1, 'El archivo o URL del logo es obligatorio.'),
    alt: z.string().trim().min(1, 'El texto alternativo es obligatorio.'),
  }),
})
export type RosacAcknowledgmentInput = z.infer<typeof rosacAcknowledgmentInputSchema>

export async function getRosacAcknowledgments(): Promise<RosacAcknowledgment[]> {
  const rows = await prisma.rosacAcknowledgment.findMany({ orderBy: { position: 'asc' } })
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    href: r.href ?? undefined,
    logo: {
      src: r.logoSrc,
      alt: r.logoAlt,
    },
  }))
}

export async function createRosacAcknowledgment(
  data: RosacAcknowledgmentInput,
): Promise<RosacAcknowledgment> {
  const maxPosition = await prisma.rosacAcknowledgment.aggregate({
    _max: { position: true },
  })
  const nextPosition = (maxPosition._max.position ?? -1) + 1

  const row = await prisma.rosacAcknowledgment.create({
    data: {
      name: data.name,
      href: data.href || null,
      logoSrc: data.logo.src,
      logoAlt: data.logo.alt,
      position: nextPosition,
    },
  })
  return {
    id: row.id,
    name: row.name,
    href: row.href ?? undefined,
    logo: {
      src: row.logoSrc,
      alt: row.logoAlt,
    },
  }
}

export async function updateRosacAcknowledgment(
  id: string,
  data: RosacAcknowledgmentInput,
): Promise<RosacAcknowledgment | null> {
  if (!UUID_REGEX.test(id)) return null
  const existing = await prisma.rosacAcknowledgment.findUnique({
    where: { id },
  })

  if (!existing) return null

  const row = await prisma.rosacAcknowledgment.update({
    where: { id: existing.id },
    data: {
      name: data.name,
      href: data.href || null,
      logoSrc: data.logo.src,
      logoAlt: data.logo.alt,
    },
  })
  return {
    id: row.id,
    name: row.name,
    href: row.href ?? undefined,
    logo: {
      src: row.logoSrc,
      alt: row.logoAlt,
    },
  }
}

export async function deleteRosacAcknowledgment(id: string): Promise<boolean> {
  if (!UUID_REGEX.test(id)) return false
  const existing = await prisma.rosacAcknowledgment.findUnique({
    where: { id },
  })
  if (!existing) return false
  await prisma.rosacAcknowledgment.delete({ where: { id: existing.id } })
  return true
}
