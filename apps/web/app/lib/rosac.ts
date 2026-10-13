import { prisma } from '@lasce/db'
import { z } from 'zod'

import es from '@/messages/es.json' with { type: 'json' }

import { getRosacConstructionContent, type ConstructionContent } from './rosac-construction'
import { getRosacInstrumentsContent, type RosacInstrumentsContent } from './rosac-instruments'

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

export type RosacCardIcon =
  | 'antenna'
  | 'location'
  | 'frequency'
  | 'sun'
  | 'tracking'
  | 'control'
  | 'receiver'
  | 'maintenance'
  | 'education'

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
}

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
  scientificConsultation: {
    title: string
    description: string
    buttonLabel: string
    href: string
  }
  backLink: { href: string; label: string }
}

/** One acknowledged institution — a logo, kept square and undistorted, plus its name. */
export interface RosacAcknowledgment {
  name: string
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
    logo: {
      src: '/images/ROSAC/acknowledgments/vicerrectoria-investigacion.webp',
      alt: 'Logo de la Vicerrectoría de Investigación de la Universidad de Costa Rica',
    },
  },
  {
    name: 'Centro de Investigaciones Espaciales (CINESPA), UCR',
    logo: {
      src: '/images/ROSAC/acknowledgments/cinespa.webp',
      alt: 'Logo del Centro de Investigaciones Espaciales (CINESPA)',
    },
  },
  {
    name: 'Escuela de Física, UCR',
    logo: {
      src: '/images/ROSAC/acknowledgments/efis.webp',
      alt: 'Logo de la Escuela de Física, UCR',
    },
  },
  {
    name: 'Escuela de Ingeniería Mecánica, UCR',
    logo: {
      src: '/images/ROSAC/acknowledgments/eim.webp',
      alt: 'Logo de la Escuela de Ingeniería Mecánica, UCR',
    },
  },
  {
    name: 'Escuela de Ingeniería Topográfica, UCR',
    logo: {
      src: '/images/ROSAC/acknowledgments/eit.webp',
      alt: 'Logo de la Escuela de Ingeniería Topográfica, UCR',
    },
  },
  {
    name: 'Escuela de Ingeniería Eléctrica, UCR',
    logo: {
      src: '/images/ROSAC/acknowledgments/eie.webp',
      alt: 'Logo de la Escuela de Ingeniería Eléctrica, UCR',
    },
  },
  {
    name: 'Recinto de Santa Cruz',
    logo: {
      src: '/images/ROSAC/acknowledgments/recinto-santa-cruz.webp',
      alt: 'Logo del Recinto de Santa Cruz, Universidad de Costa Rica',
    },
  },
  {
    name: 'Oficina de Servicios Generales (OSG), UCR',
    logo: {
      src: '/images/ROSAC/acknowledgments/osg.webp',
      alt: 'Logo de la Oficina de Servicios Generales (OSG), UCR',
    },
  },
  {
    name: 'Laboratorio Nacional de Materiales y Modelos Estructurales (LanammeUCR), UCR',
    logo: {
      src: '/images/ROSAC/acknowledgments/lanamme.webp',
      alt: 'Logo del Laboratorio Nacional de Materiales y Modelos Estructurales (LanammeUCR)',
    },
  },
  {
    name: 'Radiográfica Costarricense S.A. (RACSA)',
    logo: {
      src: '/images/ROSAC/acknowledgments/racsa.webp',
      alt: 'Logo de Radiográfica Costarricense S.A. (RACSA)',
    },
  },
  {
    name: 'Bomberos de Costa Rica',
    logo: {
      src: '/images/ROSAC/acknowledgments/bomberos-costa-rica.webp',
      alt: 'Logo de Bomberos de Costa Rica',
    },
  },
  {
    name: 'Instituto Geográfico Nacional',
    logo: {
      src: '/images/ROSAC/acknowledgments/instituto-geografico-nacional.webp',
      alt: 'Logo del Instituto Geográfico Nacional, Registro Nacional de Costa Rica',
    },
  },
  {
    name: 'INDI CR',
    logo: {
      src: '/images/ROSAC/acknowledgments/indi.webp',
      alt: 'Logo de INDI, Ingeniería y Diseño',
    },
  },
  {
    name: 'Prysmian Group',
    logo: {
      src: '/images/ROSAC/acknowledgments/prysmian-group.webp',
      alt: 'Logo de Prysmian Group',
    },
  },
  {
    name: 'EATON Costa Rica',
    logo: {
      src: '/images/ROSAC/acknowledgments/eaton.webp',
      alt: 'Logo de EATON Costa Rica',
    },
  },
  {
    name: 'Instituto Nacional de Astrofísica, Óptica y Electrónica (INAOE), México',
    logo: {
      src: '/images/ROSAC/acknowledgments/inaoe.webp',
      alt: 'Logo del Instituto Nacional de Astrofísica, Óptica y Electrónica (INAOE)',
    },
  },
  {
    name: 'Agencia Mexicana de Cooperación Internacional para el Desarrollo (AMEXCID)',
    logo: {
      src: '/images/ROSAC/acknowledgments/amexcid.webp',
      alt: 'Logo de la Agencia Mexicana de Cooperación Internacional para el Desarrollo (AMEXCID)',
    },
  },
]

export type RosacMessages = Pick<typeof es, 'rosac'>

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
  const scientificConsultation = rosac.scientificConsultation ?? es.rosac.scientificConsultation
  const backLink = rosac.backLink ?? es.rosac.backLink

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
        height: 749,
        focus: 'left',
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
      tileUrl:
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution:
        'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
      loadTimeoutMs: 15_000,
      markerLabel: location.markerLabel,
      unavailableMessage: location.unavailableMessage,
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
      people: defaultTeamPeople,
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
      ],
      cta: {
        title: donations.cta.title,
        description: donations.cta.description,
        buttonLabel: donations.cta.buttonLabel,
        href: '/contacto',
      },
    },
    scientificConsultation: {
      title: scientificConsultation.title,
      description: scientificConsultation.description,
      buttonLabel: scientificConsultation.buttonLabel,
      href: '/datos?source=ROSAC#scientific-query-title',
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
  photoUrl: string
  role: string
  name: string
  institution: string
  email: string[]
  description: string | null
}

function toTeamMember(row: ResearcherRow): TeamMember {
  return {
    id: row.id,
    src: row.photoUrl,
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
  src: z.string().trim().min(1, 'La foto es obligatoria.'),
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
 * puts the new profile at the end, same place `AddItemCard` prompted from.
 */
export async function createResearcher(
  data: ResearcherInput,
  modifiedBy: string,
): Promise<TeamMember> {
  const row = await prisma.researcher.create({
    data: {
      photoUrl: data.src,
      role: data.role,
      name: data.name,
      email: data.email ?? [],
      institution: data.institution,
      description: normalizeOptional(data.description),
      modifiedBy,
    },
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
  const existing = await prisma.researcher.findUnique({ where: { id } })
  if (!existing) return null

  const row = await prisma.researcher.update({
    where: { id },
    data: {
      photoUrl: data.src,
      role: data.role,
      name: data.name,
      email: data.email ?? [],
      institution: data.institution,
      description: normalizeOptional(data.description),
      modifiedBy,
    },
  })

  return toTeamMember(row)
}

/**
 * Deletes one researcher profile. Returns `false` when `id` does not match
 * any row, rather than throwing, so the route handler can turn that into a
 * 404 — same pre-check pattern as `updateResearcher`.
 */
export async function deleteResearcher(id: string): Promise<boolean> {
  const existing = await prisma.researcher.findUnique({ where: { id } })
  if (!existing) return false

  await prisma.researcher.delete({ where: { id } })
  return true
}
