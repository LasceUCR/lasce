/**
 * Editorial source for `/colaboraciones-e-iniciativas`. The initiative copy used to live on
 * `/nosotros`. The ISWI paragraph is the UNOOSA description, translated into Spanish. Two
 * corrections to the IVIA source: "Instituto Geofísico Nacional" is the Instituto Geográfico
 * Nacional de España, and the last sentence was cut off after "y los existen"; it closes on
 * the Northern Hemisphere, the contrast that sentence was making.
 *
 * Partner organisations live in `research-collaborations.ts` and are passed in by the route.
 */
export const collaborationsMeta = {
  title: 'Colaboraciones e Iniciativas | LASCE',
  description:
    'Organizaciones que colaboran con el LASCE y las iniciativas internacionales de las que forma parte, entre ellas la ISWI y la Iniciativa VLBI Iberoamericana.',
} as const

export interface CollaborationInitiative {
  id: string
  title: string
  paragraphs: readonly string[]
  /** Official site, opened in a new tab. */
  href?: string
  linkLabel?: string
  /** Mark shown beside the title. */
  logo?: { src: string; alt: string; width: number; height: number }
}

export interface CollaborationsContent {
  hero: { kicker: string; title: string; lead: string }
  initiatives: {
    title: string
    items: readonly CollaborationInitiative[]
  }
  backLink: { href: string; label: string }
}

export const collaborationsContent = {
  hero: {
    kicker: 'Portal público LASCE',
    title: 'Colaboraciones e Iniciativas',
    lead: 'Organizaciones que colaboran con el Laboratorio de Astrofísica Solar y Clima Espacial, y las iniciativas internacionales de las que forma parte.',
  },
  initiatives: {
    title: 'Iniciativas internacionales de las que forma parte',
    items: [
      {
        id: 'iswi',
        title: 'Iniciativa Internacional de Clima Espacial (ISWI)',
        href: 'https://www.unoosa.org/oosa/en/ourwork/psa/bssi/iswi.html',
        linkLabel: 'Sitio oficial de la ISWI',
        logo: {
          src: '/brand/logo-ISWI.png',
          alt: 'Logotipo de la Iniciativa Internacional de Clima Espacial (ISWI)',
          width: 300,
          height: 192,
        },
        paragraphs: [
          'La Iniciativa Internacional de Clima Espacial (ISWI, por sus siglas en inglés) del Comité de las Naciones Unidas sobre la Utilización del Espacio Ultraterrestre con Fines Pacíficos se puso en marcha en 2009 y concluyó formalmente como tema de la agenda del Comité en 2012. Sin embargo, las actividades de la ISWI continuaron y, desde 2013, se tratan en el nuevo tema permanente de la agenda sobre clima espacial de la Subcomisión de Asuntos Científicos y Técnicos del Comité.',
        ],
      },
      {
        id: 'ivia',
        title: 'Iniciativa VLBI Iberoamericana (IVIA)',
        logo: {
          src: '/brand/logo-Iniciativa-VLBI-Ibero-Americana.png',
          alt: 'Logotipo de la Iniciativa VLBI Iberoamericana (IVIA)',
          width: 900,
          height: 300,
        },
        paragraphs: [
          'En 2019 surgió la Iniciativa VLBI Iberoamericana (IVIA), una instancia de trabajo conjunto orientada al desarrollo de la radioastronomía en Iberoamérica, tomando como eje conceptual el desarrollo de la radioastronomía en la región y la implementación de una red VLBI en Latinoamérica, en colaboración con España y Portugal.',
          'En su conformación actual hay representantes de instituciones de Argentina, Brasil, Colombia, Costa Rica, Ecuador, México, Perú y Uruguay. Asimismo, se propone promover la participación de los demás países de la región. Participan también el Instituto Conjunto para VLBI (JIVE, con sede en Países Bajos, organización que centraliza el procesamiento de datos de la red europea de VLBI, llamada EVN), el Instituto Geográfico Nacional de España y el Instituto de Telecomunicações de Portugal.',
          'La iniciativa implica un trabajo colaborativo en la conversión de antenas de telecomunicación en radiotelescopios y su adecuación para VLBI, y el desarrollo de todas las tecnologías relacionadas. Con la unión de los recursos de las instituciones participantes, se pretende alcanzar una masa crítica para aprovechar al máximo los recursos e infraestructura existente en cada país.',
          'De esta forma, el objetivo final es crear un proyecto de colaboración internacional que tenga un gran impacto en el desarrollo integral de la región.',
          'La iniciativa contribuye fuertemente a disminuir la brecha existente entre el número de observatorios radioastronómicos del Hemisferio Sur y los existentes en el Hemisferio Norte.',
        ],
      },
    ],
  },
  backLink: {
    href: '/',
    label: 'Volver al inicio',
  },
} as const satisfies CollaborationsContent
