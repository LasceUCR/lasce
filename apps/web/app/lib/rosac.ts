import { prisma, type Prisma } from '@lasce/db'

import es from '@/messages/es.json' with { type: 'json' }

import { runWrite, WriteAbort } from '@/app/lib/cms/transaction'
import { isCurrentVersion, nextUpdatedAt, parseVersion, toVersion } from '@/app/lib/cms/version'
import { defaultLocale, type Locale } from '@/app/lib/i18n/config'
import { translationLocales, type ReviewConfirmation } from '@/app/lib/i18n/content/definition'
import {
  baseContent,
  resolveContent,
  storedContentFrom,
  translationRows,
} from '@/app/lib/i18n/content/resolve'
import { findPendingReviews } from '@/app/lib/i18n/content/review'
import {
  rosacAcknowledgmentContent,
  rosacActivityContent,
  rosacCharacteristicContent,
  rosacInstrumentContent,
  rosacResearcherContent,
  rosacStageContent,
  type RosacAcknowledgment,
  type RosacAcknowledgmentCreateInput,
  type RosacAcknowledgmentField,
  type RosacAcknowledgmentUpdateInput,
  type RosacActivityField,
  type RosacActivityItem,
  type RosacActivityUpdateInput,
  type RosacCardIcon,
  type RosacCharacteristicField,
  type RosacCharacteristicItem,
  type RosacCharacteristicUpdateInput,
  type RosacInstrumentCreateInput,
  type RosacInstrumentField,
  type RosacInstrumentUpdateInput,
  type StoredRosacInstrumentContent,
  type RosacResearcherCreateInput,
  type RosacResearcherEditingData,
  type RosacResearcherField,
  type RosacResearcherUpdateInput,
  type RosacStageField,
  type RosacStageUpdateInput,
} from './rosac-schema'
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

export * from './rosac-schema'

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
  contentLocale?: Locale | null
  editing?: RosacResearcherEditingData
  /** The lang of role and description, e.g. 'es' or 'en'. */
  contentLang?: string
  /** The stored base role before UI localization, used to initialize single-language edit forms. */
  storedRole?: string
  /** The stored base description before UI localization, used to initialize single-language edit forms. */
  storedDescription?: string
}

export type RosacResearcher = TeamMember

interface RosacTextSection {
  title: string
  paragraphs: readonly string[]
}

interface RosacCardSection {
  title: string
  items: readonly {
    id: string
    icon: RosacCardIcon
    title: string
    description: string
  }[]
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

    return {
      ...person,
      storedRole: person.storedRole ?? person.role,
      storedDescription: person.storedDescription ?? person.description,
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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function normalizeOptional(value: string | undefined | null): string | null {
  return value && value.trim() !== '' ? value.trim() : null
}

export type RosacWriteFailure<F extends string> =
  | { ok: false; reason: 'not-found' }
  | { ok: false; reason: 'conflict' }
  | { ok: false; reason: 'review-required'; pending: readonly ReviewConfirmation<F>[] }

// ---------------------------------------------------------------------------
// 1. Researchers
// ---------------------------------------------------------------------------

const researcherInclude = {
  translations: {
    where: { locale: { in: [...translationLocales] } },
    select: { locale: true, role: true, description: true },
  },
} satisfies Prisma.ResearcherInclude

type ResearcherRecord = Prisma.ResearcherGetPayload<{ include: typeof researcherInclude }>

export type RosacResearcherWriteResult =
  { ok: true; researcher: TeamMember } | RosacWriteFailure<RosacResearcherField>

function toTeamMember(
  record: ResearcherRecord,
  locale: Locale,
  includeEditingData = false,
): TeamMember {
  const stored = storedContentFrom(rosacResearcherContent, record, record.translations)
  const { content, contentLocale, isLegacy } = resolveContent(stored, locale)

  return {
    id: record.id,
    src: record.photoUrl ?? '',
    role: content.role,
    name: record.name,
    institution: record.institution,
    email: record.email.length > 0 ? record.email : undefined,
    description: content.description ?? undefined,
    contentLocale,
    ...(includeEditingData
      ? { editing: { content: stored, isLegacy, version: toVersion(record.modifiedAt) } }
      : {}),
  }
}

export async function getResearchers(
  locale: Locale = defaultLocale,
  { includeEditingData = false } = {},
): Promise<TeamMember[]> {
  const rows = await prisma.researcher.findMany({
    orderBy: { createdAt: 'asc' },
    include: researcherInclude,
  })
  return rows.map((r) => toTeamMember(r, locale, includeEditingData))
}

export async function createResearcher(
  data: RosacResearcherCreateInput,
  modifiedBy: string,
): Promise<TeamMember> {
  const { content } = data
  const base = baseContent(rosacResearcherContent, content)
  const row = await prisma.researcher.create({
    data: {
      photoUrl: normalizeOptional(data.src),
      name: data.name,
      institution: data.institution,
      email: data.email ?? [],
      role: base.role,
      description: normalizeOptional(base.description),
      modifiedBy,
      translations: {
        create: translationRows(rosacResearcherContent, content).map(({ locale, ...text }) => ({
          locale,
          ...text,
        })),
      },
    },
    include: researcherInclude,
  })

  return toTeamMember(row, defaultLocale, true)
}

export async function updateResearcher(
  id: string,
  input: RosacResearcherUpdateInput,
  modifiedBy: string,
): Promise<RosacResearcherWriteResult> {
  const expected = parseVersion(input.version)

  const result = await runWrite<ResearcherRecord, RosacWriteFailure<RosacResearcherField>>(
    async (tx) => {
      const current = await tx.researcher.findUnique({
        where: { id },
        include: researcherInclude,
      })
      if (!current) {
        throw new WriteAbort<RosacWriteFailure<RosacResearcherField>>({
          ok: false,
          reason: 'not-found',
        })
      }
      if (!isCurrentVersion(current.modifiedAt, expected)) {
        throw new WriteAbort<RosacWriteFailure<RosacResearcherField>>({
          ok: false,
          reason: 'conflict',
        })
      }

      const { content } = input
      if (content) {
        const stored = storedContentFrom(rosacResearcherContent, current, current.translations)
        const pending = findPendingReviews(
          rosacResearcherContent,
          stored,
          content,
          input.confirmedUnchanged ?? [],
        )
        if (pending.length > 0) {
          throw new WriteAbort<RosacWriteFailure<RosacResearcherField>>({
            ok: false,
            reason: 'review-required',
            pending,
          })
        }
      }

      const { count } = await tx.researcher.updateMany({
        where: { id, modifiedAt: expected },
        data: {
          ...(content ? baseContent(rosacResearcherContent, content) : {}),
          ...(input.src === undefined ? {} : { photoUrl: normalizeOptional(input.src) }),
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.institution === undefined ? {} : { institution: input.institution }),
          ...(input.email === undefined ? {} : { email: input.email }),
          modifiedBy,
          modifiedAt: nextUpdatedAt(expected),
        },
      })
      if (count === 0) {
        throw new WriteAbort<RosacWriteFailure<RosacResearcherField>>({
          ok: false,
          reason: 'conflict',
        })
      }

      if (content) {
        for (const { locale, ...text } of translationRows(rosacResearcherContent, content)) {
          await tx.researcherTranslation.upsert({
            where: { researcherId_locale: { researcherId: id, locale } },
            create: { researcherId: id, locale, ...text },
            update: text,
          })
        }
      }

      return tx.researcher.findUniqueOrThrow({
        where: { id },
        include: researcherInclude,
      })
    },
  )

  return result.ok
    ? { ok: true, researcher: toTeamMember(result.value, defaultLocale, true) }
    : result
}

export async function deleteResearcher(id: string): Promise<boolean> {
  const { count } = await prisma.researcher.deleteMany({ where: { id } })
  return count > 0
}

// ---------------------------------------------------------------------------
// 2. Characteristics
// ---------------------------------------------------------------------------

const characteristicInclude = {
  translations: {
    where: { locale: { in: [...translationLocales] } },
    select: { locale: true, title: true, description: true },
  },
} satisfies Prisma.RosacCharacteristicInclude

type CharacteristicRecord = Prisma.RosacCharacteristicGetPayload<{
  include: typeof characteristicInclude
}>

export type RosacCharacteristicWriteResult =
  | { ok: true; characteristic: RosacCharacteristicItem }
  | RosacWriteFailure<RosacCharacteristicField>

function toCharacteristicItem(
  record: CharacteristicRecord,
  locale: Locale,
  includeEditingData = false,
): RosacCharacteristicItem {
  const stored = storedContentFrom(rosacCharacteristicContent, record, record.translations)
  const { content, contentLocale, isLegacy } = resolveContent(stored, locale)

  return {
    id: record.key,
    icon: (record.icon === 'waves' ? 'frequency' : record.icon) as RosacCardIcon,
    title: content.title,
    description: content.description,
    contentLocale,
    ...(includeEditingData
      ? { editing: { content: stored, isLegacy, version: toVersion(record.updatedAt) } }
      : {}),
  }
}

export async function getRosacCharacteristics(
  locale: Locale = defaultLocale,
  { includeEditingData = false } = {},
): Promise<RosacCharacteristicItem[]> {
  const rows = await prisma.rosacCharacteristic.findMany({
    orderBy: { position: 'asc' },
    include: characteristicInclude,
  })
  return rows.map((r) => toCharacteristicItem(r, locale, includeEditingData))
}

export async function updateRosacCharacteristic(
  key: string,
  input: RosacCharacteristicUpdateInput,
): Promise<RosacCharacteristicWriteResult> {
  const expected = parseVersion(input.version)

  const result = await runWrite<CharacteristicRecord, RosacWriteFailure<RosacCharacteristicField>>(
    async (tx) => {
      const current = await tx.rosacCharacteristic.findUnique({
        where: { key },
        include: characteristicInclude,
      })
      if (!current) {
        throw new WriteAbort<RosacWriteFailure<RosacCharacteristicField>>({
          ok: false,
          reason: 'not-found',
        })
      }
      if (!isCurrentVersion(current.updatedAt, expected)) {
        throw new WriteAbort<RosacWriteFailure<RosacCharacteristicField>>({
          ok: false,
          reason: 'conflict',
        })
      }

      const { content } = input
      if (content) {
        const stored = storedContentFrom(rosacCharacteristicContent, current, current.translations)
        const pending = findPendingReviews(
          rosacCharacteristicContent,
          stored,
          content,
          input.confirmedUnchanged ?? [],
        )
        if (pending.length > 0) {
          throw new WriteAbort<RosacWriteFailure<RosacCharacteristicField>>({
            ok: false,
            reason: 'review-required',
            pending,
          })
        }
      }

      const icon = input.icon
        ? (input.icon as string) === 'waves'
          ? 'frequency'
          : input.icon
        : undefined
      const { count } = await tx.rosacCharacteristic.updateMany({
        where: { key, updatedAt: expected },
        data: {
          ...(content ? baseContent(rosacCharacteristicContent, content) : {}),
          ...(icon ? { icon } : {}),
          updatedAt: nextUpdatedAt(expected),
        },
      })
      if (count === 0) {
        throw new WriteAbort<RosacWriteFailure<RosacCharacteristicField>>({
          ok: false,
          reason: 'conflict',
        })
      }

      if (content) {
        for (const { locale, ...text } of translationRows(rosacCharacteristicContent, content)) {
          await tx.rosacCharacteristicTranslation.upsert({
            where: { characteristicId_locale: { characteristicId: current.id, locale } },
            create: { characteristicId: current.id, locale, ...text },
            update: text,
          })
        }
      }

      return tx.rosacCharacteristic.findUniqueOrThrow({
        where: { key },
        include: characteristicInclude,
      })
    },
  )

  return result.ok
    ? { ok: true, characteristic: toCharacteristicItem(result.value, defaultLocale, true) }
    : result
}

// ---------------------------------------------------------------------------
// 3. Activities
// ---------------------------------------------------------------------------

const activityInclude = {
  translations: {
    where: { locale: { in: [...translationLocales] } },
    select: { locale: true, title: true, description: true },
  },
} satisfies Prisma.RosacActivityInclude

type ActivityRecord = Prisma.RosacActivityGetPayload<{ include: typeof activityInclude }>

export type RosacActivityWriteResult =
  { ok: true; activity: RosacActivityItem } | RosacWriteFailure<RosacActivityField>

function toActivityItem(
  record: ActivityRecord,
  locale: Locale,
  includeEditingData = false,
): RosacActivityItem {
  const stored = storedContentFrom(rosacActivityContent, record, record.translations)
  const { content, contentLocale, isLegacy } = resolveContent(stored, locale)

  return {
    id: record.key,
    icon: record.icon as RosacCardIcon,
    title: content.title,
    description: content.description,
    contentLocale,
    ...(includeEditingData
      ? { editing: { content: stored, isLegacy, version: toVersion(record.updatedAt) } }
      : {}),
  }
}

export async function getRosacActivities(
  locale: Locale = defaultLocale,
  { includeEditingData = false } = {},
): Promise<RosacActivityItem[]> {
  const rows = await prisma.rosacActivity.findMany({
    orderBy: { position: 'asc' },
    include: activityInclude,
  })
  return rows.map((r) => toActivityItem(r, locale, includeEditingData))
}

export async function updateRosacActivity(
  key: string,
  input: RosacActivityUpdateInput,
): Promise<RosacActivityWriteResult> {
  const expected = parseVersion(input.version)

  const result = await runWrite<ActivityRecord, RosacWriteFailure<RosacActivityField>>(
    async (tx) => {
      const current = await tx.rosacActivity.findUnique({
        where: { key },
        include: activityInclude,
      })
      if (!current) {
        throw new WriteAbort<RosacWriteFailure<RosacActivityField>>({
          ok: false,
          reason: 'not-found',
        })
      }
      if (!isCurrentVersion(current.updatedAt, expected)) {
        throw new WriteAbort<RosacWriteFailure<RosacActivityField>>({
          ok: false,
          reason: 'conflict',
        })
      }

      const { content } = input
      if (content) {
        const stored = storedContentFrom(rosacActivityContent, current, current.translations)
        const pending = findPendingReviews(
          rosacActivityContent,
          stored,
          content,
          input.confirmedUnchanged ?? [],
        )
        if (pending.length > 0) {
          throw new WriteAbort<RosacWriteFailure<RosacActivityField>>({
            ok: false,
            reason: 'review-required',
            pending,
          })
        }
      }

      const { count } = await tx.rosacActivity.updateMany({
        where: { key, updatedAt: expected },
        data: {
          ...(content ? baseContent(rosacActivityContent, content) : {}),
          ...(input.icon ? { icon: input.icon } : {}),
          updatedAt: nextUpdatedAt(expected),
        },
      })
      if (count === 0) {
        throw new WriteAbort<RosacWriteFailure<RosacActivityField>>({
          ok: false,
          reason: 'conflict',
        })
      }

      if (content) {
        for (const { locale, ...text } of translationRows(rosacActivityContent, content)) {
          await tx.rosacActivityTranslation.upsert({
            where: { activityId_locale: { activityId: current.id, locale } },
            create: { activityId: current.id, locale, ...text },
            update: text,
          })
        }
      }

      return tx.rosacActivity.findUniqueOrThrow({
        where: { key },
        include: activityInclude,
      })
    },
  )

  return result.ok
    ? { ok: true, activity: toActivityItem(result.value, defaultLocale, true) }
    : result
}

// ---------------------------------------------------------------------------
// 4. Stages
// ---------------------------------------------------------------------------

const stageInclude = {
  translations: {
    where: { locale: { in: [...translationLocales] } },
    select: { locale: true, title: true, description: true },
  },
} satisfies Prisma.RosacStageInclude

type StageRecord = Prisma.RosacStageGetPayload<{ include: typeof stageInclude }>

export type RosacStageWriteResult =
  { ok: true; stage: ConstructionStage } | RosacWriteFailure<RosacStageField>

function toStageItem(
  record: StageRecord,
  locale: Locale,
  includeEditingData = false,
): ConstructionStage {
  const stored = storedContentFrom(rosacStageContent, record, record.translations)
  const { content, contentLocale, isLegacy } = resolveContent(stored, locale)

  return {
    id: record.key,
    title: content.title,
    navigationLabel: content.title,
    description: content.description,
    images: (record.images as unknown as ConstructionImage[]) ?? [],
    contentLocale,
    ...(includeEditingData
      ? { editing: { content: stored, isLegacy, version: toVersion(record.updatedAt) } }
      : {}),
  } as unknown as ConstructionStage
}

export async function getRosacStages(
  locale: Locale = defaultLocale,
  { includeEditingData = false } = {},
): Promise<ConstructionStage[]> {
  const rows = await prisma.rosacStage.findMany({
    orderBy: { position: 'asc' },
    include: stageInclude,
  })
  return rows.map((r) => toStageItem(r, locale, includeEditingData))
}

export async function updateRosacStage(
  key: string,
  input: RosacStageUpdateInput,
): Promise<RosacStageWriteResult> {
  const expected = parseVersion(input.version)

  const result = await runWrite<StageRecord, RosacWriteFailure<RosacStageField>>(async (tx) => {
    const current = await tx.rosacStage.findUnique({
      where: { key },
      include: stageInclude,
    })
    if (!current) {
      throw new WriteAbort<RosacWriteFailure<RosacStageField>>({
        ok: false,
        reason: 'not-found',
      })
    }
    if (!isCurrentVersion(current.updatedAt, expected)) {
      throw new WriteAbort<RosacWriteFailure<RosacStageField>>({
        ok: false,
        reason: 'conflict',
      })
    }

    const { content } = input
    if (content) {
      const stored = storedContentFrom(rosacStageContent, current, current.translations)
      const pending = findPendingReviews(
        rosacStageContent,
        stored,
        content,
        input.confirmedUnchanged ?? [],
      )
      if (pending.length > 0) {
        throw new WriteAbort<RosacWriteFailure<RosacStageField>>({
          ok: false,
          reason: 'review-required',
          pending,
        })
      }
    }

    const { count } = await tx.rosacStage.updateMany({
      where: { key, updatedAt: expected },
      data: {
        ...(content ? baseContent(rosacStageContent, content) : {}),
        ...(input.images ? { images: input.images as unknown as Prisma.InputJsonValue } : {}),
        updatedAt: nextUpdatedAt(expected),
      },
    })
    if (count === 0) {
      throw new WriteAbort<RosacWriteFailure<RosacStageField>>({
        ok: false,
        reason: 'conflict',
      })
    }

    if (content) {
      for (const { locale, ...text } of translationRows(rosacStageContent, content)) {
        await tx.rosacStageTranslation.upsert({
          where: { stageId_locale: { stageId: current.id, locale } },
          create: { stageId: current.id, locale, ...text },
          update: text,
        })
      }
    }

    return tx.rosacStage.findUniqueOrThrow({
      where: { key },
      include: stageInclude,
    })
  })

  return result.ok ? { ok: true, stage: toStageItem(result.value, defaultLocale, true) } : result
}

// ---------------------------------------------------------------------------
// 5. Instruments
// ---------------------------------------------------------------------------

const instrumentInclude = {
  translations: {
    where: { locale: { in: [...translationLocales] } },
    select: {
      locale: true,
      name: true,
      consultationLabel: true,
      consultationNotice: true,
      pendingMessage: true,
    },
  },
} satisfies Prisma.RosacInstrumentInclude

type InstrumentRecord = Prisma.RosacInstrumentGetPayload<{ include: typeof instrumentInclude }>

export type RosacInstrumentWriteResult =
  { ok: true; instrument: RosacInstrumentCardContent } | RosacWriteFailure<RosacInstrumentField>

function toInstrumentStored(record: InstrumentRecord): StoredRosacInstrumentContent {
  const baseRow = {
    name: record.name,
    description: record.consultationNotice ?? record.pendingMessage ?? '',
  }
  const translationRowsAdapted = record.translations.map((t) => ({
    locale: t.locale,
    name: t.name,
    description: t.consultationNotice ?? t.pendingMessage ?? '',
  }))
  return storedContentFrom(rosacInstrumentContent, baseRow, translationRowsAdapted)
}

function toInstrumentItem(
  record: InstrumentRecord,
  locale: Locale,
  includeEditingData = false,
): RosacInstrumentCardContent {
  const stored = toInstrumentStored(record)
  const { content, contentLocale, isLegacy } = resolveContent(stored, locale)
  const trans = record.translations.find((t) => t.locale === locale)
  const consultationLabel =
    trans?.consultationLabel ??
    (locale === 'en' && record.consultationLabel
      ? record.consultationLabel.replace(/^Consultar simulación del? /i, 'Consult simulation for ')
      : record.consultationLabel)

  return {
    id: record.id,
    name: content.name ?? '',
    pendingMessage: content.description || undefined,
    image: record.imageSrc ? { src: record.imageSrc, alt: record.imageAlt ?? '' } : undefined,
    consultation: consultationLabel
      ? {
          href: record.consultationHref ?? undefined,
          label: consultationLabel,
          notice: content.description || undefined,
        }
      : undefined,
    contentLocale,
    ...(includeEditingData
      ? { editing: { content: stored, isLegacy, version: toVersion(record.updatedAt) } }
      : {}),
  }
}

export async function getRosacInstruments(
  locale: Locale = defaultLocale,
  { includeEditingData = false } = {},
): Promise<RosacInstrumentCardContent[]> {
  const rows = await prisma.rosacInstrument.findMany({
    orderBy: { position: 'asc' },
    include: instrumentInclude,
  })
  return rows.map((r) => toInstrumentItem(r, locale, includeEditingData))
}

export async function createRosacInstrument(
  data: RosacInstrumentCreateInput,
): Promise<RosacInstrumentCardContent> {
  const count = await prisma.rosacInstrument.count()
  const { content } = data
  const base = baseContent(rosacInstrumentContent, content)

  const row = await prisma.rosacInstrument.create({
    data: {
      name: base.name,
      pendingMessage: normalizeOptional(base.description),
      consultationLabel: data.consultation?.label || `Consultar simulación de ${base.name}`,
      consultationNotice: normalizeOptional(base.description),
      imageSrc: data.image?.src || null,
      imageAlt: data.image?.alt || null,
      consultationHref: data.consultation?.href || null,
      position: count,
      translations: {
        create: translationRows(rosacInstrumentContent, content).map(({ locale, ...text }) => ({
          locale,
          name: text.name,
          consultationLabel: null,
          consultationNotice: normalizeOptional(text.description),
          pendingMessage: normalizeOptional(text.description),
        })),
      },
    },
    include: instrumentInclude,
  })

  return toInstrumentItem(row, defaultLocale, true)
}

export async function updateRosacInstrument(
  id: string,
  input: RosacInstrumentUpdateInput,
): Promise<RosacInstrumentWriteResult> {
  const expected = parseVersion(input.version)

  const result = await runWrite<InstrumentRecord, RosacWriteFailure<RosacInstrumentField>>(
    async (tx) => {
      const isUuid = UUID_REGEX.test(id)
      const current = await tx.rosacInstrument.findFirst({
        where: isUuid ? { id } : { name: id },
        include: instrumentInclude,
      })
      if (!current) {
        throw new WriteAbort<RosacWriteFailure<RosacInstrumentField>>({
          ok: false,
          reason: 'not-found',
        })
      }
      if (!isCurrentVersion(current.updatedAt, expected)) {
        throw new WriteAbort<RosacWriteFailure<RosacInstrumentField>>({
          ok: false,
          reason: 'conflict',
        })
      }

      const { content } = input
      if (content) {
        const stored = toInstrumentStored(current)
        const pending = findPendingReviews(
          rosacInstrumentContent,
          stored,
          content,
          input.confirmedUnchanged ?? [],
        )
        if (pending.length > 0) {
          throw new WriteAbort<RosacWriteFailure<RosacInstrumentField>>({
            ok: false,
            reason: 'review-required',
            pending,
          })
        }
      }

      const base = content ? baseContent(rosacInstrumentContent, content) : undefined
      const { count } = await tx.rosacInstrument.updateMany({
        where: { id: current.id, updatedAt: expected },
        data: {
          ...(base ? { name: base.name } : {}),
          ...(base
            ? {
                pendingMessage: normalizeOptional(base.description),
                consultationNotice: normalizeOptional(base.description),
              }
            : {}),
          ...(input.consultation?.label ? { consultationLabel: input.consultation.label } : {}),
          ...(input.image === undefined
            ? {}
            : {
                imageSrc: input.image?.src || null,
                imageAlt: input.image?.alt || null,
              }),
          ...(input.consultation === undefined
            ? {}
            : {
                consultationHref: input.consultation?.href || null,
              }),
          updatedAt: nextUpdatedAt(expected),
        },
      })
      if (count === 0) {
        throw new WriteAbort<RosacWriteFailure<RosacInstrumentField>>({
          ok: false,
          reason: 'conflict',
        })
      }

      if (content) {
        for (const { locale, ...text } of translationRows(rosacInstrumentContent, content)) {
          await tx.rosacInstrumentTranslation.upsert({
            where: { instrumentId_locale: { instrumentId: current.id, locale } },
            create: {
              instrumentId: current.id,
              locale,
              name: text.name,
              consultationLabel: null,
              consultationNotice: normalizeOptional(text.description),
              pendingMessage: normalizeOptional(text.description),
            },
            update: {
              name: text.name,
              consultationNotice: normalizeOptional(text.description),
              pendingMessage: normalizeOptional(text.description),
            },
          })
        }
      }

      return tx.rosacInstrument.findUniqueOrThrow({
        where: { id: current.id },
        include: instrumentInclude,
      })
    },
  )

  return result.ok
    ? { ok: true, instrument: toInstrumentItem(result.value, defaultLocale, true) }
    : result
}

export async function deleteRosacInstrument(id: string): Promise<boolean> {
  const isUuid = UUID_REGEX.test(id)
  const { count } = await prisma.rosacInstrument.deleteMany({
    where: isUuid ? { id } : { name: id },
  })
  return count > 0
}

// ---------------------------------------------------------------------------
// 6. Acknowledgments
// ---------------------------------------------------------------------------

const acknowledgmentInclude = {
  translations: {
    where: { locale: { in: [...translationLocales] } },
    select: { locale: true, name: true },
  },
} satisfies Prisma.RosacAcknowledgmentInclude

type AcknowledgmentRecord = Prisma.RosacAcknowledgmentGetPayload<{
  include: typeof acknowledgmentInclude
}>

export type RosacAcknowledgmentWriteResult =
  { ok: true; acknowledgment: RosacAcknowledgment } | RosacWriteFailure<RosacAcknowledgmentField>

function toAcknowledgmentItem(
  record: AcknowledgmentRecord,
  locale: Locale,
  includeEditingData = false,
): RosacAcknowledgment {
  const stored = storedContentFrom(rosacAcknowledgmentContent, record, record.translations)
  const { content, contentLocale, isLegacy } = resolveContent(stored, locale)

  return {
    id: record.id,
    name: content.name,
    href: record.href ?? undefined,
    logo: {
      src: record.logoSrc,
      alt: record.logoAlt,
    },
    contentLocale,
    ...(includeEditingData
      ? { editing: { content: stored, isLegacy, version: toVersion(record.updatedAt) } }
      : {}),
  }
}

export async function getRosacAcknowledgments(
  locale: Locale = defaultLocale,
  { includeEditingData = false } = {},
): Promise<RosacAcknowledgment[]> {
  const rows = await prisma.rosacAcknowledgment.findMany({
    orderBy: { position: 'asc' },
    include: acknowledgmentInclude,
  })
  return rows.map((r) => toAcknowledgmentItem(r, locale, includeEditingData))
}

export async function createRosacAcknowledgment(
  data: RosacAcknowledgmentCreateInput,
): Promise<RosacAcknowledgment> {
  const count = await prisma.rosacAcknowledgment.count()
  const { content } = data
  const base = baseContent(rosacAcknowledgmentContent, content)

  const row = await prisma.rosacAcknowledgment.create({
    data: {
      name: base.name,
      href: data.href || null,
      logoSrc: data.logo.src,
      logoAlt: data.logo.alt,
      position: count,
      translations: {
        create: translationRows(rosacAcknowledgmentContent, content).map(({ locale, ...text }) => ({
          locale,
          ...text,
        })),
      },
    },
    include: acknowledgmentInclude,
  })

  return toAcknowledgmentItem(row, defaultLocale, true)
}

export async function updateRosacAcknowledgment(
  id: string,
  input: RosacAcknowledgmentUpdateInput,
): Promise<RosacAcknowledgmentWriteResult> {
  const expected = parseVersion(input.version)

  const result = await runWrite<AcknowledgmentRecord, RosacWriteFailure<RosacAcknowledgmentField>>(
    async (tx) => {
      const isUuid = UUID_REGEX.test(id)
      const current = await tx.rosacAcknowledgment.findFirst({
        where: isUuid ? { id } : { name: id },
        include: acknowledgmentInclude,
      })
      if (!current) {
        throw new WriteAbort<RosacWriteFailure<RosacAcknowledgmentField>>({
          ok: false,
          reason: 'not-found',
        })
      }
      if (!isCurrentVersion(current.updatedAt, expected)) {
        throw new WriteAbort<RosacWriteFailure<RosacAcknowledgmentField>>({
          ok: false,
          reason: 'conflict',
        })
      }

      const { content } = input
      if (content) {
        const stored = storedContentFrom(rosacAcknowledgmentContent, current, current.translations)
        const pending = findPendingReviews(
          rosacAcknowledgmentContent,
          stored,
          content,
          input.confirmedUnchanged ?? [],
        )
        if (pending.length > 0) {
          throw new WriteAbort<RosacWriteFailure<RosacAcknowledgmentField>>({
            ok: false,
            reason: 'review-required',
            pending,
          })
        }
      }

      const base = content ? baseContent(rosacAcknowledgmentContent, content) : undefined
      const { count } = await tx.rosacAcknowledgment.updateMany({
        where: { id: current.id, updatedAt: expected },
        data: {
          ...(base ? { name: base.name } : {}),
          ...(input.href === undefined ? {} : { href: input.href || null }),
          ...(input.logo === undefined
            ? {}
            : {
                logoSrc: input.logo.src,
                logoAlt: input.logo.alt,
              }),
          updatedAt: nextUpdatedAt(expected),
        },
      })
      if (count === 0) {
        throw new WriteAbort<RosacWriteFailure<RosacAcknowledgmentField>>({
          ok: false,
          reason: 'conflict',
        })
      }

      if (content) {
        for (const { locale, ...text } of translationRows(rosacAcknowledgmentContent, content)) {
          await tx.rosacAcknowledgmentTranslation.upsert({
            where: { acknowledgmentId_locale: { acknowledgmentId: current.id, locale } },
            create: { acknowledgmentId: current.id, locale, ...text },
            update: text,
          })
        }
      }

      return tx.rosacAcknowledgment.findUniqueOrThrow({
        where: { id: current.id },
        include: acknowledgmentInclude,
      })
    },
  )

  return result.ok
    ? { ok: true, acknowledgment: toAcknowledgmentItem(result.value, defaultLocale, true) }
    : result
}

export async function deleteRosacAcknowledgment(id: string): Promise<boolean> {
  const isUuid = UUID_REGEX.test(id)
  const { count } = await prisma.rosacAcknowledgment.deleteMany({
    where: isUuid ? { id } : { name: id },
  })
  return count > 0
}
