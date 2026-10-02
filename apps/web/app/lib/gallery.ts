import { randomUUID } from 'node:crypto'

import { prisma } from '@lasce/db'
import { z } from 'zod'

export const galleryIdSchema = z.uuid()

const galleryAlbumFields = {
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'El slug debe usar letras minúsculas, números y guiones.'),
  title: z.string().trim().min(1, 'El título es obligatorio.'),
  description: z.string().trim().min(1, 'La descripción es obligatoria.'),
  yearsLabel: z.string().trim().min(1).nullable().optional(),
  coverObjectKey: z.string().trim().min(1).nullable().optional(),
}

export const galleryTopLevelAlbumInputSchema = z.object(galleryAlbumFields).strict()

export const gallerySubAlbumInputSchema = z.object(galleryAlbumFields).strict()

export const galleryAlbumUpdateSchema = z
  .object(galleryAlbumFields)
  .partial()
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    'Debe proporcionar al menos un campo para editar.',
  )

const galleryMediaFields = {
  title: z.string().trim().min(1, 'El título es obligatorio.'),
  description: z.string().trim().min(1, 'La descripción es obligatoria.'),
  alt: z.string().trim().min(1, 'El texto alternativo es obligatorio.'),
  objectKey: z.string().trim().min(1, 'La clave del archivo es obligatoria.'),
  format: z.string().trim().min(1, 'El formato es obligatorio.'),
  isVideo: z.boolean(),
  colSpan: z.number().int().min(1).max(4),
  rowSpan: z.number().int().min(1).max(4),
  date: z.string().date(),
  uploader: z.string().trim().min(1, 'El nombre de quien subió el archivo es obligatorio.'),
}

export const galleryMediaInputSchema = z
  .object({
    ...galleryMediaFields,
    isVideo: galleryMediaFields.isVideo.default(false),
    colSpan: galleryMediaFields.colSpan.default(1),
    rowSpan: galleryMediaFields.rowSpan.default(1),
  })
  .strict()

export const galleryMediaUpdateSchema = z
  .object(galleryMediaFields)
  .partial()
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    'Debe proporcionar al menos un campo para editar.',
  )

export type GalleryTopLevelAlbumInput = z.infer<typeof galleryTopLevelAlbumInputSchema>
export type GallerySubAlbumInput = z.infer<typeof gallerySubAlbumInputSchema>
export type GalleryAlbumUpdate = z.infer<typeof galleryAlbumUpdateSchema>
export type GalleryMediaInput = z.infer<typeof galleryMediaInputSchema>
export type GalleryMediaUpdate = z.infer<typeof galleryMediaUpdateSchema>

/**
 * Real content for the public gallery.
 *
 * All media items represent authentic LASCE photography from the construction
 * and development of the Radio Observatorio de Santa Cruz (ROSAC).
 *
 * Counters are derived rather than written down. `albumMeta()` builds its
 * summary from the media actually present, so a page can never advertise a file
 * count it does not have.
 */

const imageBase = '/images/galeria'

export interface GalleryMedia {
  id: string
  title: string
  description: string
  /**
   * What the image actually shows, for anyone who cannot see it. Read by the
   * lightbox, where the file is the content; the grid and the album tiles
   * render their images decoratively because a control already names them.
   */
  alt: string
  /** Capture date, already formatted for display in Spanish. */
  date: string
  /** File format as shown to visitors: JPG, JPEG, MP4, PNG… */
  format: string
  uploader: string
  isVideo: boolean
  /** Tile footprint in the masonry grid. */
  colSpan: 1 | 2 | 3 | 4
  rowSpan: 1 | 2 | 3 | 4
  /** Optional: a file still awaiting upload renders the placeholder frame. */
  src?: string
  /** MinIO object key when the media record comes from PostgreSQL. */
  objectKey?: string
}

export interface GallerySubAlbum {
  /** Database id, present for records loaded from PostgreSQL. */
  id?: string
  slug: string
  title: string
  description: string
  media: readonly GalleryMedia[]
  src?: string
  /** MinIO object key when the album record comes from PostgreSQL. */
  coverObjectKey?: string
}

export interface GalleryAlbum {
  /** Database id, present for records loaded from PostgreSQL. */
  id?: string
  slug: string
  title: string
  description: string
  /** Period the album covers, e.g. '2023–2025'. Part of the summary line. */
  years: string
  subAlbums: readonly GallerySubAlbum[]
  media: readonly GalleryMedia[]
  src?: string
  /** MinIO object key when the album record comes from PostgreSQL. */
  coverObjectKey?: string
}

export const albumSlugs = ['rosac', 'workshop-ml-2026'] as const

export type AlbumSlug = (typeof albumSlugs)[number]

export const galeriaMeta = {
  title: 'Galería | LASCE',
  description:
    'Fotografías y video de las actividades del Laboratorio de Ciencias Espaciales: construcción e instrumentación, observación y vida cotidiana del equipo.',
} as const

export const galeriaHero = {
  kicker: 'Portal público LASCE',
  title: 'Galería',
  lead: 'Fotografías y video de las actividades del laboratorio: construcción e instrumentación, observación y vida cotidiana del equipo. Organizada por álbumes.',
} as const

const previosMontajeMedia = [
  {
    id: 'previos-montaje-1',
    title: 'Almacenamiento de base y mecanismo azimutal',
    description:
      'Piezas mec\u00e1nicas principales y base de rotaci\u00f3n resguardadas en bodega antes de su traslado a sitio.',
    alt: 'Estructura mec\u00e1nica de soporte y montaje almacenada en bodega industrial.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/rosac/previos-montaje/1.jpg`,
  },
  {
    id: 'previos-montaje-2',
    title: 'Columna cil\u00edndrica del pedestal en bodega',
    description:
      'Cuerpo cil\u00edndrico de soporte estructural de la antena protegido y ubicado en el \u00e1rea de almacenamiento.',
    alt: 'Gran cilindro met\u00e1lico con bridas reforzadas apoyado horizontalmente en una nave industrial.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/previos-montaje/2.jpg`,
  },
  {
    id: 'previos-montaje-3',
    title: 'Traslado del pedestal principal con montacargas',
    description:
      'Supervisi\u00f3n del movimiento y traslado del pedestal cil\u00edndrico por parte de la Dra. Carolina Salas Matamoros.',
    alt: 'Montacargas transportando la columna cil\u00edndrica del radiotelescopio en exteriores.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/rosac/previos-montaje/3.jpg`,
  },
  {
    id: 'previos-montaje-4',
    title: 'Inspecci\u00f3n de cimientos y pernos de anclaje',
    description:
      'Revisi\u00f3n preliminar de la cimentaci\u00f3n de concreto y el c\u00edrculo de pernos de fijaci\u00f3n en el terreno.',
    alt: 'Persona con sombrero observando la base de concreto circular con pernos de anclaje.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/previos-montaje/4.jpeg`,
  },
  {
    id: 'previos-montaje-5',
    title: 'Detalle de base de cimentaci\u00f3n y corona de pernos',
    description:
      'Vista de la placa gu\u00eda circular y los pernos de fijaci\u00f3n embebidos en el pedestal de concreto.',
    alt: 'Base cil\u00edndrica de concreto con anillo met\u00e1lico y pernos de anclaje con antena al fondo.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/rosac/previos-montaje/5.jpeg`,
  },
  {
    id: 'previos-montaje-6',
    title: 'Personal t\u00e9cnico inspeccionando la base estructural',
    description:
      'Equipo t\u00e9cnico verificando niveles y alineaci\u00f3n de pernos en la base de concreto previo a la instalaci\u00f3n.',
    alt: 'Tres trabajadores revisando los pernos de la base de concreto sobre el terreno.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/previos-montaje/6.jpeg`,
  },
  {
    id: 'previos-montaje-7',
    title: 'Primer plano de pernos roscados de nivelaci\u00f3n',
    description:
      'Aproximaci\u00f3n a los pernos de alta resistencia y placas de nivelaci\u00f3n en la superficie de la base.',
    alt: 'Detalle en primer plano de pernos de anclaje roscados y arandelas de soporte.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/rosac/previos-montaje/7.jpeg`,
  },
  {
    id: 'previos-montaje-8',
    title: 'Inspecci\u00f3n interna de la columna de soporte',
    description:
      'T\u00e9cnico examinando el interior y las uniones de la columna cil\u00edndrica en el \u00e1rea de resguardo.',
    alt: 'Operario inspeccionando la parte interior del cilindro met\u00e1lico en el almac\u00e9n.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/previos-montaje/8.jpeg`,
  },
  {
    id: 'previos-montaje-9',
    title: 'Transporte de equipo topogr\u00e1fico en almac\u00e9n',
    description:
      'Personal trasladando instrumentos de medici\u00f3n y escaneo cerca de las partes estructurales.',
    alt: 'Persona transportando estuche de estaci\u00f3n total o esc\u00e1ner en nave industrial junto al pedestal.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/rosac/previos-montaje/9.jpeg`,
  },
  {
    id: 'previos-montaje-10',
    title: 'M\u00f3dulo azimutal asegurado en transporte terrestre',
    description:
      'Conjunto del mecanismo de rotaci\u00f3n y base de soporte fijado con fajas en el contenedor del cami\u00f3n.',
    alt: 'Plataforma mec\u00e1nica de la antena amarrada dentro del furg\u00f3n de un cami\u00f3n de carga.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/previos-montaje/10.jpeg`,
  },
  {
    id: 'previos-montaje-11',
    title: 'Maniobra de carga de la columna estructural',
    description:
      'Operaci\u00f3n de transporte con montacargas del tramo cil\u00edndrico de soporte en v\u00edas externas.',
    alt: 'Montacargas movilizando el cilindro estructural met\u00e1lico sobre asfalto.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/rosac/previos-montaje/11.jpeg`,
  },
  {
    id: 'previos-montaje-12',
    title: 'Equipo colaborador en visita t\u00e9cnica a reflectores',
    description:
      'Dra. Carolina Salas Matamoros y colaboradores durante una jornada de inspecci\u00f3n en las instalaciones.',
    alt: 'Tres investigadores posando en el \u00e1rea exterior junto a las estructuras de antenas.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/previos-montaje/12.jpg`,
  },
  {
    id: 'previos-montaje-13',
    title: 'Llegada de cami\u00f3n gr\u00faa con componentes estructurales',
    description:
      'Arribo de transporte pesado con brazo hidr\u00e1ulico cargado de elementos met\u00e1licos al sitio de montaje.',
    alt: 'Cami\u00f3n blanco con gr\u00faa hidr\u00e1ulica estacionado en el campo junto a la antena.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/rosac/previos-montaje/13.JPG`,
  },
  {
    id: 'previos-montaje-14',
    title: 'Detalle de ensamble de anillo de rodamiento y piezas',
    description:
      'Anillo met\u00e1lico circular con pernos pasantes y piezas angulares organizadas en la estructura de soporte.',
    alt: 'Vista cercana de anillo circular de montaje con herrajes y pernos de ajuste.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/rosac/previos-montaje/14.JPG`,
  },
] as const satisfies readonly GalleryMedia[]

const fotogrametriaMedia = [
  {
    id: 'fotogrametria-1',
    title: 'Preparaci\u00f3n de equipo e iluminaci\u00f3n nocturna en la antena',
    description:
      'Vista nocturna de la estructura de la antena con iluminaci\u00f3n de apoyo y plataforma de elevaci\u00f3n durante trabajos t\u00e9cnicos.',
    alt: 'Antena parab\u00f3lica iluminada en la noche con una gr\u00faa canastilla al lado.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/rosac/fotogrametria/1.jpg`,
  },
  {
    id: 'fotogrametria-2',
    title: 'Silueta del radiotelescopio al atardecer',
    description:
      'Estructura del plato orientada hacia el cenit con plataforma de elevaci\u00f3n en el \u00e1rea de trabajo durante el atardecer.',
    alt: 'Silueta de la antena parab\u00f3lica y plataforma elevadora contra el cielo al atardecer.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/fotogrametria/2.jpg`,
  },
  {
    id: 'fotogrametria-3',
    title: 'Trabajos de medici\u00f3n y colocaci\u00f3n de dianas en el plato',
    description:
      'Personal t\u00e9cnico realizando labores de medici\u00f3n y ajuste de referencias sobre los paneles del plato reflector.',
    alt: 'Dos t\u00e9cnicos trabajando en el interior del plato reflector de la antena utilizando equipo de medici\u00f3n.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/fotogrametria/3.jpeg`,
  },
  {
    id: 'fotogrametria-4',
    title: 'Labores t\u00e9cnicas en el anillo central del reflector',
    description:
      'Personal realizando mediciones e inspecci\u00f3n de paneles y puntos de control en la superficie de la antena.',
    alt: 'T\u00e9cnicos realizando labores de inspecci\u00f3n y fijaci\u00f3n de puntos de referencia en la antena.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/rosac/fotogrametria/4.jpeg`,
  },
  {
    id: 'fotogrametria-5',
    title: 'Herramientas y equipo manual de trabajo',
    description:
      'Disposici\u00f3n de herramientas manuales, llaves, dados y nivel utilizados durante las labores de montaje o ajuste.',
    alt: 'Juego de herramientas mec\u00e1nicas manuales ordenadas sobre el piso.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/rosac/fotogrametria/5.jpeg`,
  },
] as const satisfies readonly GalleryMedia[]

const montajeMedia = [
  {
    id: 'montaje-1',
    title: 'Equipo en la estructura de la antena',
    description:
      'Integrantes del equipo de trabajo sobre la plataforma y base de la antena durante las labores de montaje.',
    alt: 'Miembros del equipo posando en la estructura met\u00e1lica y base de la antena bajo cielo despejado.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/rosac/montaje/1.jpeg`,
  },
  {
    id: 'montaje-2',
    title: 'Transporte de componente estructural',
    description:
      'Traslado en cami\u00f3n de carga de una secci\u00f3n cil\u00edndrica de la base de la antena hacia el sitio de instalaci\u00f3n.',
    alt: 'Cami\u00f3n de plataforma transportando una gran pieza met\u00e1lica cil\u00edndrica asegurada con cadenas por carretera.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/montaje/2.jpeg`,
  },
  {
    id: 'montaje-3',
    title: 'Llegada de componentes al sitio',
    description:
      'Parte del equipo reunido junto al cami\u00f3n de transporte que traslada la base met\u00e1lica al terreno del proyecto.',
    alt: 'Grupo de personas posando frente al cami\u00f3n de carga con la estructura met\u00e1lica en el terreno del observatorio.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/rosac/montaje/3.jpeg`,
  },
  {
    id: 'montaje-4',
    title: 'Inspecci\u00f3n de mecanismos y motores',
    description:
      'Personal t\u00e9cnico realizando ajustes y revisi\u00f3n en el sistema motriz y plataforma de la antena.',
    alt: 'Dos t\u00e9cnicos inspeccionando motores y mecanismos de transmisi\u00f3n sobre la plataforma met\u00e1lica de la base.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/montaje/4.jpeg`,
  },
  {
    id: 'montaje-5',
    title: 'Preparaci\u00f3n de maniobras con gr\u00faa',
    description:
      'Alineaci\u00f3n y preparaci\u00f3n de cables de izaje junto a la base met\u00e1lica y la edificaci\u00f3n del observatorio.',
    alt: 'Operario preparando eslingas y gancho de gr\u00faa en el terreno cerca de la estructura met\u00e1lica.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/rosac/montaje/5.jpeg`,
  },
  {
    id: 'montaje-6',
    title: 'Trabajos en altura sobre la estructura',
    description:
      'Uso de plataforma elevadora articulada para acceder a la armadura posterior del reflector parab\u00f3lico.',
    alt: 'Brazo mec\u00e1nico elevador con personal trabajando en la estructura reticular de la antena de radio.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/montaje/6.jpeg`,
  },
  {
    id: 'montaje-7',
    title: 'Aseguramiento de panel reflector',
    description:
      'Preparaci\u00f3n en tierra de un panel reflector para su elevaci\u00f3n hacia la armadura de la antena.',
    alt: 'Operarios preparando un panel met\u00e1lico triangular con cadenas de izaje junto a la plataforma elevadora.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/rosac/montaje/7.jpeg`,
  },
  {
    id: 'montaje-8',
    title: 'Izaje y gu\u00eda de panel reflector',
    description:
      'Perspectiva en picada del guiado de un segmento del reflector sujeto a la cesta de elevaci\u00f3n.',
    alt: 'Vista a\u00e9rea de un operario en la canasta elevadora dirigiendo el ascenso de un panel met\u00e1lico triangular.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/montaje/8.jpeg`,
  },
  {
    id: 'montaje-9',
    title: 'Colaboradores junto a panel y andamio',
    description:
      'Personal t\u00e9cnico junto al panel del plato y el andamio de soporte en el terreno de montaje.',
    alt: 'Cuatro trabajadores posando de pie cerca de un panel del reflector y la estructura de andamiaje.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/rosac/montaje/9.jpeg`,
  },
  {
    id: 'montaje-10',
    title: 'Vista superior de plataforma elevadora',
    description:
      'Toma cenital desde la antena mostrando la plataforma m\u00f3vil y personal t\u00e9cnico en tierra.',
    alt: 'Vista desde lo alto de la plataforma elevadora con dos personas en la cesta sobre el c\u00e9sped.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/montaje/10.jpeg`,
  },
  {
    id: 'montaje-11',
    title: 'Gr\u00faa telesc\u00f3pica y base en el sitio',
    description:
      'Gr\u00faa de carga pesada y cami\u00f3n de soporte ubicados junto a la base met\u00e1lica del telescopio.',
    alt: 'Gr\u00faa telesc\u00f3pica amarilla estacionada cerca de la base cil\u00edndrica y un \u00e1rbol frondoso en el terreno.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/rosac/montaje/11.jpg`,
  },
  {
    id: 'montaje-12',
    title: 'Elevaci\u00f3n de secci\u00f3n del reflector',
    description:
      'Maniobra de izaje de un panel del plato hacia la estructura montada sobre el pedestal cil\u00edndrico.',
    alt: 'Brazo de elevaci\u00f3n izando un segmento de panel hacia la estructura parab\u00f3lica parcialmente ensamblada.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/montaje/12.jpg`,
  },
  {
    id: 'montaje-13',
    title: 'Equipo t\u00e9cnico en la estructura',
    description:
      'La Dra. Carolina Salas Matamoros junto a integrantes del equipo en la estructura met\u00e1lica de la antena con equipo de seguridad.',
    alt: 'Tres personas con arneses de seguridad posan en el interior de la estructura met\u00e1lica.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/rosac/montaje/13.jpg`,
  },
  {
    id: 'montaje-14',
    title: 'Instalaci\u00f3n de paneles en el plato',
    description:
      'T\u00e9cnicos fijando secciones del reflector sobre el entramado estructural de la antena.',
    alt: 'Personal sobre andamios y plataforma elevadora ajustando paneles met\u00e1licos en el armaz\u00f3n del plato.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/montaje/14.jpg`,
  },
  {
    id: 'montaje-15',
    title: 'Recepci\u00f3n nocturna de componentes',
    description:
      'La Dra. Carolina Salas Matamoros junto a colaboradores sobre la base met\u00e1lica transportada durante la jornada nocturna.',
    alt: 'Grupo de personas sentadas sobre el cilindro met\u00e1lico en la plataforma del cami\u00f3n durante la noche.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/rosac/montaje/15.jpg`,
  },
  {
    id: 'montaje-16',
    title: 'Montaje de superficie reflectora',
    description:
      'Colaboradores trabajando en la fijaci\u00f3n de las piezas del reflector sobre la estructura de soporte.',
    alt: 'T\u00e9cnicos asegurando paneles met\u00e1licos a la estructura reticular de la antena desde andamios.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/montaje/16.jpg`,
  },
  {
    id: 'montaje-17',
    title: 'Colaboradores en la base de la antena',
    description:
      'La Dra. Carolina Salas Matamoros sentada en la barandilla de la torre junto a miembros del equipo de trabajo.',
    alt: 'Tres colaboradores sonr\u00eden junto a la barandilla de la torre de la antena.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/rosac/montaje/17.jpg`,
  },
  {
    id: 'montaje-18',
    title: 'Colocaci\u00f3n del pedestal sobre cimiento',
    description:
      'Base cil\u00edndrica de la antena posicionada sobre la zapata circular de concreto en el terreno.',
    alt: 'Pedestal met\u00e1lico cil\u00edndrico anclado a la base de concreto con operarios trabajando en la plataforma superior.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/montaje/18.jpg`,
  },
  {
    id: 'montaje-19',
    title: 'Alineaci\u00f3n de segmento de plato',
    description:
      'Maniobra de aproximaci\u00f3n de un panel reflector hacia la estructura circular con asistencia de plataforma elevadora.',
    alt: 'Plataforma elevando un panel triangular hacia la armadura met\u00e1lica donde operarios esperan para fijarlo.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/rosac/montaje/19.jpg`,
  },
  {
    id: 'montaje-20',
    title: 'Personal de apoyo en el \u00e1rea de montaje',
    description:
      'Colaborador con equipo de protecci\u00f3n personal junto al pedestal cil\u00edndrico de la antena.',
    alt: 'Joven con arn\u00e9s de seguridad de pie junto a la base met\u00e1lica cil\u00edndrica y la gr\u00faa de soporte.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/montaje/20.jpg`,
  },
  {
    id: 'montaje-21',
    title: 'Equipo de trabajo junto a la base',
    description:
      'La Dra. Carolina Salas Matamoros y colaboradores compartiendo en la base de concreto de la antena.',
    alt: 'Cuatro personas posan sonriendo sentadas y de pie en el cimiento de concreto de la antena.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/rosac/montaje/21.jpg`,
  },
  {
    id: 'montaje-22',
    title: 'Fijaci\u00f3n inferior de panel',
    description:
      'Detalle de las labores de empernado y fijaci\u00f3n del panel a la estructura soporte del plato.',
    alt: 'Operarios sobre andamio asegurando la parte inferior de un panel met\u00e1lico a las vigas de soporte.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/montaje/22.jpg`,
  },
  {
    id: 'montaje-23',
    title: 'Labores bajo la estructura del plato',
    description:
      'La Dra. Carolina Salas Matamoros y un colega sobre andamios bajo el armaz\u00f3n del reflector parab\u00f3lico.',
    alt: 'Dos personas sobre el andamiaje met\u00e1lico directamente debajo de la estructura radial del plato.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/rosac/montaje/23.jpg`,
  },
  {
    id: 'montaje-24',
    title: 'Instalaci\u00f3n del pedestal con gr\u00faa',
    description:
      'Montaje del cuerpo cil\u00edndrico del pedestal sobre la zapata de concreto al atardecer mediante gr\u00faa.',
    alt: 'Gr\u00faa telesc\u00f3pica sosteniendo la base met\u00e1lica cil\u00edndrica mientras operarios gu\u00edan su apoyo en el cimiento.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/montaje/24.jpeg`,
  },
  {
    id: 'montaje-25',
    title: 'Revisi\u00f3n t\u00e9cnica de la plataforma motriz',
    description:
      'Detalle de los mecanismos mec\u00e1nicos y motores de orientaci\u00f3n sobre la plataforma antes del ensamblaje.',
    alt: 'T\u00e9cnicos realizando inspecci\u00f3n en el m\u00f3dulo de motores y rodamientos sobre la plataforma de la base.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/rosac/montaje/25.jpeg`,
  },
  {
    id: 'montaje-26',
    title: 'Izaje de plataforma motriz',
    description:
      'Maniobra de gr\u00faa levantando la plataforma de mecanismos para colocarla sobre el pedestal cil\u00edndrico.',
    alt: 'Plataforma circular con barandilla suspendida por cables de gr\u00faa directamente sobre la torre cil\u00edndrica.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/montaje/26.jpeg`,
  },
  {
    id: 'montaje-27',
    title: 'Acoplamiento de plataforma al pedestal',
    description:
      'Gu\u00eda manual y descenso de la plataforma de giro sobre la parte superior del pedestal de la antena.',
    alt: 'Operarios sobre una escalera ajustando la uni\u00f3n entre la plataforma suspendida y el cilindro base.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/rosac/montaje/27.jpeg`,
  },
  {
    id: 'montaje-28',
    title: 'Estructura radial de la antena',
    description:
      'Perspectiva vertical hacia el eje central y las vigas radiales del plato con personal en la torre.',
    alt: 'Vista en contrapicada del centro de la antena y sus vigas radiales con t\u00e9cnicos trabajando en lo alto.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/montaje/28.jpeg`,
  },
] as const satisfies readonly GalleryMedia[]

const instalacionElectricaMedia = [
  {
    id: 'instalacion-electrica-1',
    title: 'T\u00e9cnico trabajando en la estructura del pedestal',
    description:
      'Un t\u00e9cnico equipado con casco y arn\u00e9s de seguridad realiza labores de cableado e instalaci\u00f3n en la parte superior del pedestal.',
    alt: 'T\u00e9cnico con arn\u00e9s y casco azul sujetando cables sobre la estructura met\u00e1lica del pedestal de la antena.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/rosac/instalacion-electrica/1.jpeg`,
  },
  {
    id: 'instalacion-electrica-2',
    title: 'Trabajos en el sistema motriz de la antena',
    description:
      'T\u00e9cnicos revisando el ensamble del motor y la transmisi\u00f3n mec\u00e1nica en la plataforma superior del radiotelescopio.',
    alt: 'Dos t\u00e9cnicos inspeccionando y ajustando componentes mec\u00e1nicos y de accionamiento en la plataforma de la antena.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/instalacion-electrica/2.jpeg`,
  },
  {
    id: 'instalacion-electrica-3',
    title: 'Organizaci\u00f3n de herramientas al pie de la estructura',
    description:
      'Preparaci\u00f3n de instrumental, cajas de herramientas y equipo de nivelaci\u00f3n para los trabajos de montaje el\u00e9ctrico y mec\u00e1nico.',
    alt: 'Miembro del equipo junto a cajas de herramientas y equipo t\u00e9cnico al pie de la torre de la antena.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/rosac/instalacion-electrica/3.jpeg`,
  },
  {
    id: 'instalacion-electrica-4',
    title: 'Inspecci\u00f3n de canalizaciones en el pedestal',
    description:
      'T\u00e9cnico verificando el tendido y las conexiones de canalizaci\u00f3n el\u00e9ctrica sobre la estructura soporte de la antena.',
    alt: 'T\u00e9cnico inclinado sobre la estructura met\u00e1lica inspeccionando elementos de conexi\u00f3n y canalizaci\u00f3n.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/instalacion-electrica/4.jpeg`,
  },
  {
    id: 'instalacion-electrica-5',
    title: 'Fijaci\u00f3n y perforaci\u00f3n de soportes en plataforma',
    description:
      'Uso de herramienta el\u00e9ctrica para fijar soportes y herrajes met\u00e1licos sobre la plataforma del radiotelescopio.',
    alt: 'T\u00e9cnico utilizando un taladro en una placa met\u00e1lica sobre la plataforma elevada de la antena.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/rosac/instalacion-electrica/5.jpeg`,
  },
  {
    id: 'instalacion-electrica-6',
    title: 'Alineaci\u00f3n de tuber\u00eda conduit en la base',
    description:
      'Revisi\u00f3n del guiado de tuber\u00eda conduit r\u00edgida para el paso seguro de cableado de fuerza y control.',
    alt: 'T\u00e9cnico ajustando tuber\u00eda de canalizaci\u00f3n el\u00e9ctrica que desciende por la estructura de la torre.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/instalacion-electrica/6.jpeg`,
  },
  {
    id: 'instalacion-electrica-7',
    title: 'Canalizaci\u00f3n el\u00e9ctrica en la base de la torre',
    description:
      'T\u00e9cnicos coordinando la instalaci\u00f3n de ductos y registros en la parte inferior de la estructura soporte.',
    alt: 'T\u00e9cnicos trabajando al pie del pedestal en el montaje de ductos y tuber\u00edas de alimentaci\u00f3n el\u00e9ctrica.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/rosac/instalacion-electrica/7.jpeg`,
  },
  {
    id: 'instalacion-electrica-8',
    title: 'Montaje de canalizaciones en altura media',
    description:
      'Personal t\u00e9cnico utilizando escaleras para acoplar tuber\u00edas conduit a las abrazaderas de la torre.',
    alt: 'Dos t\u00e9cnicos asegurando canalizaciones el\u00e9ctricas en la estructura met\u00e1lica con apoyo de una escalera.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/instalacion-electrica/8.jpeg`,
  },
  {
    id: 'instalacion-electrica-9',
    title: 'Supervisi\u00f3n t\u00e9cnica con la Dra. Carolina Salas Matamoros',
    description:
      'La Dra. Carolina Salas Matamoros supervisando junto a un miembro del equipo los avances en los mecanismos del pedestal.',
    alt: 'Dra. Carolina Salas Matamoros y un t\u00e9cnico examinando los mecanismos de rotaci\u00f3n y soporte de la antena.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/instalacion-electrica/9.JPG`,
  },
  {
    id: 'instalacion-electrica-10',
    title: 'Acceso a la parte superior del pedestal',
    description:
      'T\u00e9cnico ascendiendo por escalera para realizar ajustes en la torniller\u00eda y cajas de conexiones superiores.',
    alt: 'T\u00e9cnico sobre escalera trabajando en la articulaci\u00f3n mec\u00e1nica del pedestal de la antena.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/instalacion-electrica/10.jpeg`,
  },
  {
    id: 'instalacion-electrica-11',
    title: 'Dra. Carolina Salas Matamoros y equipo en la plataforma',
    description:
      'La Dra. Carolina Salas Matamoros y colaboradores en la plataforma de trabajo durante una pausa en la instalaci\u00f3n.',
    alt: 'Dra. Carolina Salas Matamoros sonriendo junto a colaboradores sobre la plataforma de la estructura.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/rosac/instalacion-electrica/11.JPG`,
  },
  {
    id: 'instalacion-electrica-12',
    title: 'Revisi\u00f3n conjunta en la plataforma de la antena',
    description:
      'La Dra. Carolina Salas Matamoros y el equipo t\u00e9cnico revisando detalles del ensamblaje en lo alto del pedestal.',
    alt: 'Dra. Carolina Salas Matamoros y personal t\u00e9cnico dialogando sobre la plataforma de servicio de la antena.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/instalacion-electrica/12.jpeg`,
  },
  {
    id: 'instalacion-electrica-13',
    title: 'Ajuste de ensamblajes en la torre soporte',
    description:
      'Miembros del equipo coordinando el ajuste manual de pernos y fijaciones estructurales en la plataforma.',
    alt: 'Integrantes del equipo t\u00e9cnico trabajando en las uniones mec\u00e1nicas de la plataforma del radiotelescopio.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/rosac/instalacion-electrica/13.jpeg`,
  },
  {
    id: 'instalacion-electrica-14',
    title: 'Dra. Carolina Salas Matamoros y colaboradores frente al plato',
    description:
      'La Dra. Carolina Salas Matamoros y miembros del equipo en la plataforma con el reflector parab\u00f3lico de fondo.',
    alt: 'Dra. Carolina Salas Matamoros posando en la plataforma superior junto a tres colaboradores frente al plato.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/instalacion-electrica/14.JPG`,
  },
  {
    id: 'instalacion-electrica-15',
    title: 'Coordinaci\u00f3n t\u00e9cnica sobre el pedestal',
    description:
      'La Dra. Carolina Salas Matamoros y parte del grupo t\u00e9cnico organizando las siguientes etapas de montaje en la estructura.',
    alt: 'Dra. Carolina Salas Matamoros y miembros del equipo t\u00e9cnico reunidos en la plataforma de la antena.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/rosac/instalacion-electrica/15.jpeg`,
  },
  {
    id: 'instalacion-electrica-16',
    title: 'Verificaci\u00f3n de sensores e interruptores de fin de carrera',
    description:
      'Inspecci\u00f3n t\u00e9cnica de los mecanismos de final de carrera y cableado de detecci\u00f3n en el eje de la antena.',
    alt: 'T\u00e9cnicos verificando topes mec\u00e1nicos y sensores el\u00e9ctricos de recorrido en la montura de la antena.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/instalacion-electrica/16.jpeg`,
  },
  {
    id: 'instalacion-electrica-17',
    title: 'Ajuste de cables de alimentaci\u00f3n en el motorreductor',
    description:
      'Conexi\u00f3n y fijaci\u00f3n de acometida y terminales en la unidad de motorizaci\u00f3n del pedestal.',
    alt: 'T\u00e9cnicos manipulando cables y terminales junto al motor el\u00e9ctrico de accionamiento.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/instalacion-electrica/17.jpeg`,
  },
  {
    id: 'instalacion-electrica-18',
    title: 'Revisi\u00f3n de caja de conexiones y terminales',
    description:
      'T\u00e9cnico examinando el conexionado interno dentro de una caja de derivaci\u00f3n en la estructura.',
    alt: 'T\u00e9cnico revisando cables y borneras dentro de una caja de derivaci\u00f3n met\u00e1lica montada en la estructura.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/instalacion-electrica/18.jpeg`,
  },
  {
    id: 'instalacion-electrica-19',
    title: 'Aseguramiento de conductos en el soporte estructural',
    description:
      'Fijaci\u00f3n final de abrazaderas y gu\u00edas de cableado a lo largo del soporte met\u00e1lico principal.',
    alt: 'T\u00e9cnico apretando abrazaderas para sujetar las tuber\u00edas de cableado a la viga de soporte.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/rosac/instalacion-electrica/19.jpeg`,
  },
  {
    id: 'instalacion-electrica-20',
    title: 'Preparaci\u00f3n de m\u00f3dulo de radiofrecuencia en mesa de trabajo',
    description:
      'Miembro del equipo mostrando una placa de circuito electr\u00f3nico de RF con conectores SMA y cableado en el taller.',
    alt: 'Miembro del equipo sonriendo en el \u00e1rea de trabajo sosteniendo un circuito impreso de radiofrecuencia con conectores.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/instalacion-electrica/20.jpeg`,
  },
  {
    id: 'instalacion-electrica-21',
    title: 'Fotograf\u00eda grupal en exteriores con la Dra. Carolina Salas Matamoros',
    description:
      'El equipo del proyecto junto a la Dra. Carolina Salas Matamoros reunidos frente a las instalaciones con el radiotelescopio de fondo.',
    alt: 'Grupo de trabajo y la Dra. Carolina Salas Matamoros sentados frente al edificio de control con la antena detr\u00e1s.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/rosac/instalacion-electrica/21.jpg`,
  },
  {
    id: 'instalacion-electrica-22',
    title: 'Reuni\u00f3n nocturna del equipo con la Dra. Carolina Salas Matamoros',
    description:
      'La Dra. Carolina Salas Matamoros y miembros del equipo compartiendo en la terraza tras concluir la jornada de trabajo.',
    alt: 'La Dra. Carolina Salas Matamoros, colaboradores y una mascota comparten en el patio durante la noche.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/instalacion-electrica/22.jpg`,
  },
  {
    id: 'instalacion-electrica-23',
    title: 'Lubricaci\u00f3n y sellado de brida del motor',
    description:
      'T\u00e9cnicos aplicando lubricante y sellador en el acople y rodamiento del motorreductor sobre la plataforma.',
    alt: 'Dos t\u00e9cnicos aplicando compuesto de sellado y grasa a la brida de uni\u00f3n de un motor en la antena.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/rosac/instalacion-electrica/23.jpg`,
  },
  {
    id: 'instalacion-electrica-24',
    title: 'Fotograf\u00eda del equipo en \u00e1reas verdes con la Dra. Carolina Salas Matamoros',
    description:
      'La Dra. Carolina Salas Matamoros y colaboradores sentados en el c\u00e9sped con la gran antena parab\u00f3lica en segundo plano.',
    alt: 'Dra. Carolina Salas Matamoros y cinco integrantes del equipo sentados en el jard\u00edn frente al radiotelescopio.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/instalacion-electrica/24.jpg`,
  },
  {
    id: 'instalacion-electrica-25',
    title: 'Mantenimiento y ensamblaje de motor el\u00e9ctrico en laboratorio',
    description:
      'T\u00e9cnicos equipados con guantes protectores instalando la cubierta y el ventilador en un motorreductor industrial.',
    alt: 'Dos t\u00e9cnicos armando la carcasa y la tapa de ventilaci\u00f3n de un motor el\u00e9ctrico sobre una mesa de trabajo.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/rosac/instalacion-electrica/25.jpg`,
  },
  {
    id: 'instalacion-electrica-26',
    title: 'Equipo de trabajo junto a la Dra. Carolina Salas Matamoros en la base de la torre',
    description:
      'Fotograf\u00eda grupal de la Dra. Carolina Salas Matamoros y el equipo alrededor del pedestal de concreto y las canalizaciones.',
    alt: 'Dra. Carolina Salas Matamoros y colaboradores posando de pie alrededor de la base cil\u00edndrica de concreto del radiotelescopio.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/instalacion-electrica/26.jpg`,
  },
  {
    id: 'instalacion-electrica-27',
    title: 'Inspecci\u00f3n de engranajes y transmisi\u00f3n de elevaci\u00f3n',
    description:
      'T\u00e9cnicos se\u00f1alando y evaluando el acople mec\u00e1nico y la holgura en el mecanismo de accionamiento de elevaci\u00f3n.',
    alt: 'T\u00e9cnicos en la plataforma se\u00f1alando el eje y el sistema de engranajes del mecanismo de elevaci\u00f3n.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/rosac/instalacion-electrica/27.jpg`,
  },
  {
    id: 'instalacion-electrica-28',
    title: 'Supervisi\u00f3n de engranajes reductores con la Dra. Carolina Salas Matamoros',
    description:
      'Vista detallada de los engranajes helicoidales lubricados con grasa, observados por la Dra. Carolina Salas Matamoros.',
    alt: 'Engranajes internos de la caja reductora cubiertos de grasa observados por la Dra. Carolina Salas Matamoros al fondo.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/instalacion-electrica/28.jpg`,
  },
  {
    id: 'instalacion-electrica-29',
    title: 'Descanso del equipo en la sala de operaciones',
    description:
      'Miembros del equipo descansando dentro del recinto de control tras una jornada intensiva de trabajo.',
    alt: 'Cinco colaboradores sentados en sof\u00e1s y sillas dentro de la sala de control al atardecer.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/rosac/instalacion-electrica/29.jpeg`,
  },
  {
    id: 'instalacion-electrica-30',
    title: 'Dra. Carolina Salas Matamoros y colaboradores en la barandilla de la torre',
    description:
      'La Dra. Carolina Salas Matamoros y cinco integrantes del equipo sentados a lo largo de la barandilla de la plataforma circular.',
    alt: 'Dra. Carolina Salas Matamoros y colaboradores sentados sobre la barandilla de seguridad de la torre de la antena.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/instalacion-electrica/30.jpeg`,
  },
  {
    id: 'instalacion-electrica-31',
    title: 'Ajuste de soporte y sensor en la estructura de la antena',
    description:
      'T\u00e9cnico calibrando un soporte met\u00e1lico para sensor en una de las secciones estructurales del telescopio.',
    alt: 'T\u00e9cnico ajustando un soporte mec\u00e1nico con sensor en una barra met\u00e1lica de la estructura de la antena.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/rosac/instalacion-electrica/31.jpeg`,
  },
  {
    id: 'instalacion-electrica-32',
    title: 'Ajuste mec\u00e1nico del motorreductor con llave de carraca',
    description:
      'T\u00e9cnicos asegurando la perner\u00eda del motorreductor sobre su base en la plataforma de la antena.',
    alt: 'T\u00e9cnicos utilizando llave de carraca para ajustar los pernos de fijaci\u00f3n de un motor el\u00e9ctrico sobre el pedestal.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/instalacion-electrica/32.jpeg`,
  },
  {
    id: 'instalacion-electrica-33',
    title: 'Bobinado de cobre y rotor de motor el\u00e9ctrico abierto',
    description:
      'Detalle en primer plano del estator con devanados de cobre, rodamiento y eje del rotor durante tareas de mantenimiento.',
    alt: 'Primer plano del bobinado de cobre, eje y rodamiento de un motor el\u00e9ctrico industrial destapado.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/rosac/instalacion-electrica/33.jpeg`,
  },
  {
    id: 'instalacion-electrica-34',
    title: 'Dra. Carolina Salas Matamoros en la zona de motores del pedestal',
    description:
      'Fotograf\u00eda de la Dra. Carolina Salas Matamoros junto a los motores de accionamiento y herramientas de mantenimiento en la plataforma.',
    alt: 'Dra. Carolina Salas Matamoros en plano cercano con los motores y herramientas de mantenimiento en la plataforma del pedestal.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/instalacion-electrica/34.jpeg`,
  },
  {
    id: 'instalacion-electrica-35',
    title: 'Cableado de tablero el\u00e9ctrico de distribuci\u00f3n exterior',
    description:
      'T\u00e9cnico electricista organizando y conectando conductores de potencia de distintos colores en el panel de distribuci\u00f3n.',
    alt: 'T\u00e9cnico trabajando en la conexi\u00f3n de cables el\u00e9ctricos de colores en un tablero de distribuci\u00f3n a la intemperie.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/rosac/instalacion-electrica/35.jpeg`,
  },
  {
    id: 'instalacion-electrica-36',
    title: 'Tendido de conductores desde caja de registro subterr\u00e1nea',
    description:
      'T\u00e9cnicos guiando y jalando cables el\u00e9ctricos desde una arqueta subterr\u00e1nea hacia el tablero exterior.',
    alt: 'Miembros del equipo manipulando rollos de cables el\u00e9ctricos entre una zanja abierta y el tablero de distribuci\u00f3n.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/instalacion-electrica/36.jpeg`,
  },
  {
    id: 'instalacion-electrica-37',
    title: 'T\u00e9cnico dentro de pozo de registro subterr\u00e1neo',
    description:
      'Operario ubicado dentro del pozo de registro el\u00e9ctrico supervisando la entrada de ductos hacia la antena.',
    alt: 'T\u00e9cnico de pie dentro de una arqueta subterr\u00e1nea abierta inspeccionando la llegada de tuber\u00edas conduit.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/rosac/instalacion-electrica/37.jpeg`,
  },
  {
    id: 'instalacion-electrica-38',
    title: 'Punto de acometida el\u00e9ctrica y cajas de cable',
    description:
      'Vista cenital del registro subterr\u00e1neo, cajas de conductor el\u00e9ctrico EcoPlus y el tablero de interruptores abierto.',
    alt: 'Cajas de cable conductor y manguera junto a la arqueta subterr\u00e1nea y el tablero el\u00e9ctrico abierto.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/instalacion-electrica/38.jpeg`,
  },
  {
    id: 'instalacion-electrica-39',
    title: 'Trabajos en pasarela bajo el plato parab\u00f3lico',
    description:
      'Perspectiva ascendente de t\u00e9cnicos realizando maniobras en la escalera y pasarela de servicio bajo la par\u00e1bola.',
    alt: 'Vista en contrapicado de dos t\u00e9cnicos trabajando sobre la pasarela met\u00e1lica bajo la estructura del plato parab\u00f3lico.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/rosac/instalacion-electrica/39.jpeg`,
  },
  {
    id: 'instalacion-electrica-40',
    title: 'Soldadura de precisi\u00f3n de conector DB-9 en laboratorio',
    description:
      'Operaci\u00f3n de esta\u00f1ado y soldadura de conductores en pines de un conector serie con estaci\u00f3n de soldar Aoyue.',
    alt: 'Vista superior de manos utilizando caut\u00edn para soldar cables en los pines de un conector tipo DB-9 sobre mesa de trabajo.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/instalacion-electrica/40.jpeg`,
  },
  {
    id: 'instalacion-electrica-41',
    title: 'Motorreductor industrial para posicionamiento',
    description:
      'Motorreductor el\u00e9ctrico industrial con brida y carcasa gris preparado para su instalaci\u00f3n.',
    alt: 'Motorreductor el\u00e9ctrico gris sobre base de cart\u00f3n en el suelo del laboratorio.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/rosac/instalacion-electrica/41.jpeg`,
  },
  {
    id: 'instalacion-electrica-42',
    title: 'Revisi\u00f3n interna de devanados y rodamiento del motor',
    description:
      'Desensamble del motorreductor para verificar el estado de los devanados del estator y el rodamiento del eje.',
    alt: 'T\u00e9cnicos con guantes amarillos trabajando sobre el motor abierto mostrando el bobinado y rodamiento del eje.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/rosac/instalacion-electrica/42.jpeg`,
  },
  {
    id: 'instalacion-electrica-43',
    title: 'Inspecci\u00f3n de tren de engranajes y lubricaci\u00f3n',
    description:
      'T\u00e9cnico examinando los engranajes helicoidales con grasa lubricante de la etapa reductora del motor.',
    alt: 'T\u00e9cnico con gafas observando de cerca los engranajes helicoidales engrasados de la reductora de velocidad.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/rosac/instalacion-electrica/43.jpeg`,
  },
] as const satisfies readonly GalleryMedia[]

const donacionesMedia = [
  {
    id: 'donaciones-1',
    title: 'Fotografía grupal oficial de entrega de donación',
    description:
      'Equipo de trabajo ampliado y la Dra. Carolina Salas Matamoros reunidos con el equipamiento eléctrico donado.',
    alt: 'Seis participantes posando en grupo junto a los gabinetes y tableros eléctricos.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/rosac/donaciones/1.jpeg`,
  },
  {
    id: 'donaciones-2',
    title: 'Muestra de equipo de distribución y medición eléctrica',
    description:
      'La Dra. Carolina Salas Matamoros y colaboradores exhibiendo el equipo eléctrico y panel de control donados.',
    alt: 'Toma vertical de cuatro personas sonriendo junto al equipo de control eléctrico donado.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/rosac/donaciones/2.jpeg`,
  },
  {
    id: 'donaciones-3',
    title: 'Comprobación de componentes de tablero eléctrico donado',
    description:
      'Encuadre amplio de la entrega de equipos de conmutación y medición de energía eléctrica.',
    alt: 'Cuatro personas junto a módulos de paneles eléctricos industriales en un pasillo.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/rosac/donaciones/3.jpeg`,
  },
] as const satisfies readonly GalleryMedia[]

const rosacMedia = [
  {
    id: 'rosac-1',
    title: 'Trabajos nocturnos en el radiotelescopio',
    description:
      'Vista nocturna de las antenas del observatorio con una plataforma elevadora realizando labores t\u00e9cnicas en la antena principal.',
    alt: 'Antena parab\u00f3lica de radiotelescopio iluminada de noche junto a un elevador hidr\u00e1ulico y otra antena secundaria.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/rosac/1.jpg`,
  },
  {
    id: 'rosac-2',
    title: 'Ajuste de paneles en el plato reflector',
    description:
      'Dos t\u00e9cnicos realizando trabajos de ensamblaje y calibraci\u00f3n sobre la superficie del plato de la antena.',
    alt: 'Dos personas con sombreros trabajando en el interior del plato reflector cerca del anillo central.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/2.jpg`,
  },
  {
    id: 'rosac-3',
    title: 'Inspecci\u00f3n de la base de concreto',
    description:
      'Personal t\u00e9cnico sobre la zapata de cimentaci\u00f3n y los pernos de anclaje de la antena.',
    alt: 'Tres operarios de pie sobre la base circular de hormig\u00f3n con pernos de anclaje y antena al fondo bajo cielo azul.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/rosac/3.jpg`,
  },
  {
    id: 'rosac-4',
    title: 'Descarga y transporte de estructuras',
    description:
      'Cami\u00f3n gr\u00faa transportando componentes y vigas met\u00e1licas para el ensamblaje en el sitio del observatorio.',
    alt: 'Cami\u00f3n blanco con brazo articulado rojo transportando estructuras met\u00e1licas junto a una antena y caseta.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/rosac/4.jpg`,
  },
  {
    id: 'rosac-5',
    title: 'Maniobra de izaje del pedestal met\u00e1lico',
    description:
      'Gr\u00faa posicionando el pedestal cil\u00edndrico met\u00e1lico mientras los operarios gu\u00edan el anclaje.',
    alt: 'Operario sobre el cilindro met\u00e1lico sostenido por cadenas de gr\u00faa durante las maniobras de montaje.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/rosac/5.jpg`,
  },
  {
    id: 'rosac-6',
    title: 'Montaje de la plataforma superior de azimut',
    description:
      'Izaje de la plataforma y mecanismo motriz superior sobre el pedestal del radiotelescopio con supervisi\u00f3n en tierra.',
    alt: 'Estructura superior de la antena suspendida por gr\u00faa sobre el pedestal met\u00e1lico mientras el equipo supervisa abajo.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/rosac/6.jpg`,
  },
  {
    id: 'rosac-7',
    title: 'Instalaci\u00f3n del armaz\u00f3n estructural posterior',
    description:
      'T\u00e9cnico en plataforma elevadora ajustando la estructura reticular de soporte del reflector.',
    alt: 'Brazo articulado amarillo elevando a un t\u00e9cnico hacia la estructura de celos\u00eda met\u00e1lica posterior del plato.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 2,
    src: `${imageBase}/rosac/7.jpg`,
  },
  {
    id: 'rosac-8',
    title: 'Equipo de trabajo en la torre del radiotelescopio',
    description:
      'Integrantes del equipo t\u00e9cnico y colaboradores, incluida la Dra. Carolina Salas Matamoros, posando en la estructura de la antena.',
    alt: 'Grupo de personas y una mascota posando en las diferentes plataformas y niveles de la estructura del radiotelescopio.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/rosac/8.jpg`,
  },
  {
    id: 'rosac-9',
    title: 'Colocaci\u00f3n de panel reflector con brazo elevador',
    description:
      'Maniobra de elevaci\u00f3n de un gajo del reflector parab\u00f3lico para su acople en la estructura de soporte.',
    alt: 'Plataforma elevadora izando un panel met\u00e1lico hacia la par\u00e1bola del radiotelescopio asistida por operarios.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/rosac/9.jpg`,
  },
  {
    id: 'rosac-10',
    title: 'Inspecci\u00f3n del sistema de motores y engranajes',
    description:
      'Revisi\u00f3n t\u00e9cnica de los motores de elevaci\u00f3n y contrapesos en el cabezal del mecanismo de orientaci\u00f3n.',
    alt: 'Especialista sonriendo junto al motor el\u00e9ctrico y el contrapeso del mecanismo de movimiento de la antena.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/rosac/10.jpg`,
  },
  {
    id: 'rosac-11',
    title: 'Fotograf\u00eda grupal del equipo frente a la torre',
    description:
      'Investigadores, ingenieros y colaboradores, junto a la Dra. Carolina Salas Matamoros, al pie de la torre de la antena.',
    alt: 'Grupo de once personas del equipo posando de pie y en la base frente a la torre del radiotelescopio.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/rosac/11.jpg`,
  },
  {
    id: 'rosac-12',
    title: 'Tendido de cableado el\u00e9ctrico y de control',
    description:
      'Personal t\u00e9cnico realizando la canalizaci\u00f3n y conexionado subterr\u00e1neo desde la caseta de control hacia la antena.',
    alt: 'Tres operarios manipulando rollos de cables en una arqueta exterior junto a la caseta y la antena al fondo.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/rosac/12.jpg`,
  },
  {
    id: 'rosac-13',
    title: 'Instalaci\u00f3n del panel de protecci\u00f3n el\u00e9ctrica',
    description:
      'T\u00e9cnico trabajando en la conexi\u00f3n del tablero el\u00e9ctrico y dispositivos de supresi\u00f3n de sobretensiones.',
    alt: 'Primer plano de un operario conectando cables en un tablero el\u00e9ctrico exterior con protecciones y disyuntores.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 2,
    src: `${imageBase}/rosac/13.jpg`,
  },
  {
    id: 'rosac-14',
    title: 'Mantenimiento y cableado en la plataforma superior',
    description:
      'T\u00e9cnicos realizando el guiado y tendido de cables a trav\u00e9s del conducto central bajo el plato reflector.',
    alt: 'Dos operarios en la pasarela circular superior de la antena introduciendo cables por la abertura central.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/rosac/14.jpg`,
  },
  {
    id: 'rosac-15',
    title: 'Entrega y recepci\u00f3n de equipo el\u00e9ctrico',
    description:
      'Representantes del proyecto, incluida la Dra. Carolina Salas Matamoros, posando junto a tableros y equipos el\u00e9ctricos donados.',
    alt: 'Seis personas posando en interiores junto a tableros de distribuci\u00f3n el\u00e9ctrica y material t\u00e9cnico.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/rosac/15.jpg`,
  },
  {
    id: 'rosac-16',
    title: 'El ROSAC durante el atardecer',
    description:
      'Perspectiva en contrapicado del ROSAC y su armazón estructural al atardecer, con una antena secundaria visible en segundo plano.',
    alt: 'Vista angular de la antena parabólica y el pedestal del ROSAC bajo el cielo dorado del atardecer.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/rosac/16.JPG`,
  },
] as const satisfies readonly GalleryMedia[]

const workshopMlMedia = [
  {
    id: 'workshop-ml-1',
    title: 'Comité y participantes junto al cartel oficial',
    description:
      'Miembros de la organización y participantes, incluida la Dra. Carolina Salas Matamoros, posando junto al banner del evento.',
    alt: 'Grupo de personas posando de pie frente al banner del taller de Machine Learning y clima espacial.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/workshop-ml-2026/1.jpg`,
  },
  {
    id: 'workshop-ml-2',
    title: 'Intervención de la Dra. Carolina Salas Matamoros',
    description:
      'La Dra. Carolina Salas Matamoros dirigiéndose al público desde el podio durante una de las sesiones del taller.',
    alt: 'Dra. Carolina Salas Matamoros hablando ante el micrófono en el podio de la Universidad de Costa Rica.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 2,
    src: `${imageBase}/workshop-ml-2026/2.jpg`,
  },
  {
    id: 'workshop-ml-3',
    title: 'Palabras de la Dra. Carolina Salas Matamoros',
    description:
      'Momento de la intervención de la Dra. Carolina Salas Matamoros durante las actividades del evento académico.',
    alt: 'Primer plano de la Dra. Carolina Salas Matamoros sonriendo mientras se dirige a la audiencia desde el podio.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/workshop-ml-2026/3.jpg`,
  },
  {
    id: 'workshop-ml-4',
    title: 'Conferencia sobre fenómenos solares',
    description:
      'Sesión académica en el auditorio con proyección de láminas explicativas sobre física solar y fulguraciones.',
    alt: 'Expositor en el escenario del auditorio proyectando una lámina informativa sobre erupciones solares.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/workshop-ml-2026/4.jpg`,
  },
  {
    id: 'workshop-ml-5',
    title: 'Sesión práctica de análisis y programación',
    description:
      'Participantes trabajando con sus computadoras portátiles durante una sesión práctica interactiva.',
    alt: 'Asistentes en el auditorio con computadoras portátiles abiertas siguiendo una sesión práctica proyectada en pantalla.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/workshop-ml-2026/5.jpg`,
  },
  {
    id: 'workshop-ml-6',
    title: 'Fotografía grupal en el auditorio',
    description:
      'Participantes, ponentes y organizadores reunidos en el escenario principal del auditorio.',
    alt: 'Grupo general de asistentes y organizadores del taller posando en el escenario del auditorio.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/workshop-ml-2026/6.jpg`,
  },
  {
    id: 'workshop-ml-7',
    title: 'Recorrido por áreas exteriores',
    description:
      'Grupo de participantes recorriendo senderos y jardines durante una actividad al aire libre.',
    alt: 'Participantes del evento caminando en grupo por un sendero rodeado de vegetación y flores.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/workshop-ml-2026/7.jpg`,
  },
  {
    id: 'workshop-ml-8',
    title: 'Banner oficial del taller',
    description:
      'Identidad visual y cartel informativo del taller internacional sobre Machine Learning y Clima Espacial.',
    alt: 'Cartel vertical del evento con logotipos de las entidades organizadoras y el título del taller.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/workshop-ml-2026/8.jpg`,
  },
  {
    id: 'workshop-ml-9',
    title: 'Participantes y colaboradoras junto al cartel del evento',
    description:
      'Asistentes y colaboradoras, entre ellas la Dra. Carolina Salas Matamoros, posando junto al banner institucional.',
    alt: 'Tres participantes posando sonrientes de pie frente al banner oficial del taller.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/workshop-ml-2026/9.jpg`,
  },
  {
    id: 'workshop-ml-10',
    title: 'Presentación sobre el Radio Observatorio de Santa Cruz',
    description:
      'La Dra. Carolina Salas Matamoros exponiendo detalles y avances vinculados al Radio Observatorio de Santa Cruz (ROSAC).',
    alt: 'Dra. Carolina Salas Matamoros en el podio presentando diapositivas sobre el Radio Observatorio de Santa Cruz.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/workshop-ml-2026/10.jpg`,
  },
  {
    id: 'workshop-ml-11',
    title: 'Exposición magistral de la Dra. Carolina Salas Matamoros',
    description:
      'La Dra. Carolina Salas Matamoros durante el desarrollo de una conferencia magistral desde el podio.',
    alt: 'Dra. Carolina Salas Matamoros dirigiéndose al auditorio con gestos explicativos desde el podio.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/workshop-ml-2026/11.jpg`,
  },
  {
    id: 'workshop-ml-12',
    title: 'Ponencia sobre modelado y Machine Learning',
    description:
      'Presentación técnica sobre el desarrollo de emuladores y modelos de aprendizaje automático en estudios ionosféricos.',
    alt: 'Expositor presentando diapositivas técnicas de machine learning aplicadas a irregularidades ionosféricas.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/workshop-ml-2026/12.jpg`,
  },
  {
    id: 'workshop-ml-13',
    title: 'Audiencia y participantes en el auditorio',
    description:
      'Vista general de los asistentes y participantes siguiendo con atención las exposiciones del programa.',
    alt: 'Participantes sentados en las butacas del auditorio escuchando una de las ponencias del evento.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/workshop-ml-2026/13.jpg`,
  },
  {
    id: 'workshop-ml-14',
    title: 'Charla técnica sobre clima espacial y eyecciones de masa',
    description:
      'Presentación académica en el auditorio con datos observacionales sobre eventos y dinámica solar.',
    alt: 'Expositor en el escenario junto a la pantalla que proyecta gráficas e imágenes de datos solares.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/workshop-ml-2026/14.jpg`,
  },
  {
    id: 'workshop-ml-15',
    title: 'Visita grupal al Jardín Botánico Lankester',
    description:
      'Fotografía de recuerdo de los participantes durante una visita al Jardín Botánico Lankester.',
    alt: 'Grupo de participantes posando en el exterior junto al rótulo del Jardín Botánico Lankester.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/workshop-ml-2026/15.jpg`,
  },
  {
    id: 'workshop-ml-16',
    title: 'Intervención protocolaria en el podio',
    description:
      'La Dra. Carolina Salas Matamoros en el atril durante una sesión protocolaria o de apertura.',
    alt: 'Dra. Carolina Salas Matamoros atenta a sus notas en el podio institucional junto a la bandera nacional.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 2,
    src: `${imageBase}/workshop-ml-2026/16.jpg`,
  },
  {
    id: 'workshop-ml-17',
    title: 'Vista panorámica del escenario durante la sesión técnica',
    description:
      'Perspectiva amplia del auditorio y el escenario durante la exposición de resultados científicos.',
    alt: 'Toma panorámica del escenario del auditorio con el ponente en el atril y la presentación proyectada en pantalla.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/workshop-ml-2026/17.jpg`,
  },
  {
    id: 'workshop-ml-18',
    title: 'Encuentro social en Restaurante y Mirador Ram Luna',
    description:
      'Participantes y organizadores reunidos durante una velada social con vista panorámica a la ciudad.',
    alt: 'Grupo de participantes reunidos de noche en el Restaurante y Mirador Ram Luna con la ciudad iluminada de fondo.',
    date: '16-20 feb 2026',
    format: 'JPG',
    uploader: 'LASCE',
    isVideo: false,
    colSpan: 4,
    rowSpan: 2,
    src: `${imageBase}/workshop-ml-2026/18.jpg`,
  },
] as const satisfies readonly GalleryMedia[]

export const galleryAlbums = {
  rosac: {
    slug: 'rosac',
    title: 'Fotos del ROSAC',
    description:
      'Documentación fotográfica del desarrollo, montaje y adecuación del Radio Observatorio de Santa Cruz (ROSAC).',
    years: '2019–2023',
    src: `${imageBase}/rosac/8.jpg`,
    subAlbums: [
      {
        slug: 'previos-montaje',
        title: 'Trabajos previos al montaje',
        description:
          'Preparación del sitio, cimentación y adecuación logística de los componentes del observatorio.',
        src: `${imageBase}/rosac/previos-montaje/1.jpg`,
        media: previosMontajeMedia,
      },
      {
        slug: 'fotogrametria',
        title: 'Trabajos de fotogrametría para calibrar la parábola',
        description:
          'Estudios iniciales, levantamiento métrico y documentación de la geometría del reflector.',
        src: `${imageBase}/rosac/fotogrametria/1.jpg`,
        media: fotogrametriaMedia,
      },
      {
        slug: 'montaje',
        title: 'Montaje de la estructura',
        description:
          'Posicionamiento, elevación y ensamblaje de los componentes estructurales del radiotelescopio.',
        src: `${imageBase}/rosac/montaje/1.jpeg`,
        media: montajeMedia,
      },
      {
        slug: 'instalacion-electrica',
        title: 'Instalación eléctrica de los motores y de control',
        description:
          'Conexión de sistemas eléctricos, cableado de potencia y acondicionamiento de gabinetes de control.',
        src: `${imageBase}/rosac/instalacion-electrica/1.jpeg`,
        media: instalacionElectricaMedia,
      },
      {
        slug: 'donaciones',
        title: 'Donación EATON para ROSAC',
        description:
          'Equipamiento y tableros eléctricos recibidos para la infraestructura energética del radiotelescopio.',
        src: `${imageBase}/rosac/donaciones/3.jpeg`,
        media: donacionesMedia,
      },
    ],
    media: rosacMedia,
  },
  'workshop-ml-2026': {
    slug: 'workshop-ml-2026',
    title: '2026 Workshop on Machine Learning Applied to Space Weather and GNSS',
    description:
      'Taller enfocado en el estudio de la relación Sol-Tierra, el análisis de datos científicos y la aplicación de técnicas de inteligencia artificial y aprendizaje automático al clima espacial y los sistemas GNSS.',
    years: 'febrero 2026',
    src: `${imageBase}/workshop-ml-2026/1.jpg`,
    subAlbums: [],
    media: workshopMlMedia,
  },
} as const satisfies Record<AlbumSlug, GalleryAlbum>

/** Every album, in the order the gallery index presents them. */
export const galleryAlbumList: readonly GalleryAlbum[] = albumSlugs.map(
  (slug) => galleryAlbums[slug],
)

export function albumPath(slug: string): string {
  return `/galeria/${slug}`
}

export function subAlbumPath(albumSlug: string, subAlbumSlug: string): string {
  return `/galeria/${albumSlug}/${subAlbumSlug}`
}

export function isAlbumSlug(value: string): value is AlbumSlug {
  return albumSlugs.includes(value as AlbumSlug)
}

export function getAlbum(slug: string): GalleryAlbum | null {
  return isAlbumSlug(slug) ? galleryAlbums[slug] : null
}

export function getSubAlbum(albumSlug: string, subAlbumSlug: string): GallerySubAlbum | null {
  const album = getAlbum(albumSlug)

  return album?.subAlbums.find((subAlbum) => subAlbum.slug === subAlbumSlug) ?? null
}

/** Every album/sub-album pair, for `generateStaticParams` and the sitemap. */
export function subAlbumParams(): { slug: string; subalbum: string }[] {
  return galleryAlbumList.flatMap((album) =>
    album.subAlbums.map((subAlbum) => ({ slug: album.slug, subalbum: subAlbum.slug })),
  )
}

/** Files in the album itself plus everything in its sub-albums. */
export function albumFileCount(album: GalleryAlbum): number {
  return album.subAlbums.reduce(
    (total, subAlbum) => total + subAlbum.media.length,
    album.media.length,
  )
}

/** Summary line for an album: sub-albums, total files and the years covered. */
export function albumMeta(album: GalleryAlbum): string {
  const parts = [`${albumFileCount(album)} archivos`, album.years]

  if (album.subAlbums.length > 0) {
    parts.unshift(`${album.subAlbums.length} subálbumes`)
  }

  return parts.join(' · ')
}

/** The "N archivos en este álbum" counter shown beside a media grid. */
export function albumMediaMeta(media: readonly GalleryMedia[]): string {
  return `${media.length} archivos en este álbum`
}

/** Placeholder caption for a media tile whose file has not been uploaded. */
export function mediaPlaceholder(item: GalleryMedia): string {
  return `${item.isVideo ? 'Video' : 'Foto'}: ${item.title}`
}

type DatabaseGalleryMedia = {
  id: string
  title: string
  description: string
  altText: string
  objectKey: string
  format: string
  isVideo: boolean
  colSpan: number
  rowSpan: number
  capturedAt: Date
  uploaderName: string
}

/** Validates a stored tile dimension before narrowing it to the gallery's supported span. */
function toGalleryTileSpan(value: number, mediaId: string, dimension: string): 1 | 2 | 3 | 4 {
  if (value === 1 || value === 2 || value === 3 || value === 4) return value
  throw new Error(`Gallery media ${mediaId} has invalid ${dimension}: ${value}`)
}

function publicGallerySource(objectKey: string | null | undefined): string | undefined {
  return objectKey?.startsWith('/images/galeria/') ? objectKey : undefined
}

/** Converts a database media record to the public gallery shape while retaining its object key. */
function toGalleryMedia(media: DatabaseGalleryMedia): GalleryMedia {
  const src = publicGallerySource(media.objectKey)

  return {
    id: media.id,
    title: media.title,
    description: media.description,
    alt: media.altText,
    date: media.capturedAt.toISOString().slice(0, 10),
    format: media.format,
    uploader: media.uploaderName,
    isVideo: media.isVideo,
    colSpan: toGalleryTileSpan(media.colSpan, media.id, 'colSpan'),
    rowSpan: toGalleryTileSpan(media.rowSpan, media.id, 'rowSpan'),
    objectKey: media.objectKey,
    ...(src ? { src } : {}),
  }
}

/** Loads top-level albums and their nested albums/media in display order, including database IDs. */
export async function getGalleryAlbums(): Promise<GalleryAlbum[]> {
  const albums = await prisma.galleryAlbum.findMany({
    where: { parentAlbumId: null },
    orderBy: { createdAt: 'asc' },
    include: {
      media: { orderBy: { position: 'asc' } },
      subAlbums: {
        orderBy: { createdAt: 'asc' },
        include: { media: { orderBy: { position: 'asc' } } },
      },
    },
  })

  return albums.map((album) => {
    const src = publicGallerySource(album.coverObjectKey)

    return {
      id: album.id,
      slug: album.slug,
      title: album.title,
      description: album.description,
      years: album.yearsLabel ?? '',
      coverObjectKey: album.coverObjectKey ?? undefined,
      ...(src ? { src } : {}),
      subAlbums: album.subAlbums.map((subAlbum) => {
        const subAlbumSrc = publicGallerySource(subAlbum.coverObjectKey)

        return {
          id: subAlbum.id,
          slug: subAlbum.slug,
          title: subAlbum.title,
          description: subAlbum.description,
          coverObjectKey: subAlbum.coverObjectKey ?? undefined,
          ...(subAlbumSrc ? { src: subAlbumSrc } : {}),
          media: subAlbum.media.map(toGalleryMedia),
        }
      }),
      media: album.media.map(toGalleryMedia),
    }
  })
}

type CreateGalleryMediaResult =
  { ok: true; media: GalleryMedia } | { ok: false; reason: 'album-not-found' | 'conflict' }

/** Adds media to an album at the next position without uploading or deleting the asset itself. */
export async function createGalleryMedia(
  albumId: string,
  data: GalleryMediaInput,
): Promise<CreateGalleryMediaResult> {
  const album = await prisma.galleryAlbum.findUnique({
    where: { id: albumId },
    select: { id: true },
  })
  if (!album) return { ok: false, reason: 'album-not-found' }

  const lastMedia = await prisma.galleryMedia.findFirst({
    where: { albumId },
    orderBy: { position: 'desc' },
    select: { position: true },
  })

  try {
    const media = await prisma.galleryMedia.create({
      data: {
        albumId,
        title: data.title,
        description: data.description,
        altText: data.alt,
        objectKey: data.objectKey,
        format: data.format,
        isVideo: data.isVideo,
        colSpan: data.colSpan,
        rowSpan: data.rowSpan,
        capturedAt: new Date(`${data.date}T00:00:00.000Z`),
        uploaderName: data.uploader,
        position: (lastMedia?.position ?? -1) + 1,
      },
    })
    return { ok: true, media: toGalleryMedia(media) }
  } catch (error) {
    if (hasPrismaErrorCode(error, 'P2002')) return { ok: false, reason: 'conflict' }
    if (hasPrismaErrorCode(error, 'P2003')) return { ok: false, reason: 'album-not-found' }
    throw error
  }
}

type UpdateGalleryMediaResult =
  { ok: true; media: GalleryMedia } | { ok: false; reason: 'not-found' | 'conflict' }

/** Updates supplied media metadata fields; the stored asset is never modified here. */
export async function updateGalleryMedia(
  mediaId: string,
  data: GalleryMediaUpdate,
): Promise<UpdateGalleryMediaResult> {
  const updateData = {
    ...(data.title !== undefined ? { title: data.title } : {}),
    ...(data.description !== undefined ? { description: data.description } : {}),
    ...(data.alt !== undefined ? { altText: data.alt } : {}),
    ...(data.objectKey !== undefined ? { objectKey: data.objectKey } : {}),
    ...(data.format !== undefined ? { format: data.format } : {}),
    ...(data.isVideo !== undefined ? { isVideo: data.isVideo } : {}),
    ...(data.colSpan !== undefined ? { colSpan: data.colSpan } : {}),
    ...(data.rowSpan !== undefined ? { rowSpan: data.rowSpan } : {}),
    ...(data.date !== undefined ? { capturedAt: new Date(`${data.date}T00:00:00.000Z`) } : {}),
    ...(data.uploader !== undefined ? { uploaderName: data.uploader } : {}),
  }

  try {
    const media = await prisma.galleryMedia.update({
      where: { id: mediaId },
      data: updateData,
    })
    return { ok: true, media: toGalleryMedia(media) }
  } catch (error) {
    if (hasPrismaErrorCode(error, 'P2025')) return { ok: false, reason: 'not-found' }
    if (hasPrismaErrorCode(error, 'P2002')) return { ok: false, reason: 'conflict' }
    throw error
  }
}

/** Deletes the media database record only; the associated asset is left untouched. */
export async function deleteGalleryMedia(mediaId: string): Promise<boolean> {
  const result = await prisma.galleryMedia.deleteMany({ where: { id: mediaId } })
  return result.count > 0
}

type GalleryAlbumFields = GallerySubAlbumInput

type CreateTopLevelAlbumResult =
  | { ok: true; album: Awaited<ReturnType<typeof prisma.galleryAlbum.create>> }
  | { ok: false; reason: 'duplicate-slug' }

export async function createTopLevelGalleryAlbum(
  data: GalleryTopLevelAlbumInput,
): Promise<CreateTopLevelAlbumResult> {
  try {
    const album = await prisma.galleryAlbum.create({
      data: toAlbumCreateData(data, null),
    })
    return { ok: true, album }
  } catch (error) {
    if (!hasPrismaErrorCode(error, 'P2002')) throw error
  }

  try {
    const album = await prisma.galleryAlbum.create({
      data: toAlbumCreateData({ ...data, slug: `${data.slug}-${randomUUID()}` }, null),
    })
    return { ok: true, album }
  } catch (error) {
    if (hasPrismaErrorCode(error, 'P2002')) return { ok: false, reason: 'duplicate-slug' }
    throw error
  }
}

type UpdateGalleryAlbumResult =
  | { ok: true; album: Awaited<ReturnType<typeof prisma.galleryAlbum.update>> }
  | { ok: false; reason: 'not-found' | 'duplicate-slug' }

/** Updates supplied album fields without changing its parent or contents. */
export async function updateGalleryAlbum(
  albumId: string,
  data: GalleryAlbumUpdate,
): Promise<UpdateGalleryAlbumResult> {
  const updateData = {
    ...(data.slug !== undefined ? { slug: data.slug } : {}),
    ...(data.title !== undefined ? { title: data.title } : {}),
    ...(data.description !== undefined ? { description: data.description } : {}),
    ...(data.yearsLabel !== undefined ? { yearsLabel: data.yearsLabel } : {}),
    ...(data.coverObjectKey !== undefined ? { coverObjectKey: data.coverObjectKey } : {}),
  }

  try {
    const album = await prisma.galleryAlbum.update({
      where: { id: albumId },
      data: updateData,
    })
    return { ok: true, album }
  } catch (error) {
    if (hasPrismaErrorCode(error, 'P2025')) return { ok: false, reason: 'not-found' }
    if (hasPrismaErrorCode(error, 'P2002')) return { ok: false, reason: 'duplicate-slug' }
    throw error
  }
}

/** Deletes an album and its cascading database records*/
export async function deleteGalleryAlbum(albumId: string): Promise<boolean> {
  const result = await prisma.galleryAlbum.deleteMany({ where: { id: albumId } })
  return result.count > 0
}

type CreateSubAlbumResult =
  | { ok: true; album: Awaited<ReturnType<typeof prisma.galleryAlbum.create>> }
  | { ok: false; reason: 'parent-not-found' | 'parent-not-top-level' | 'duplicate-slug' }

export async function createGallerySubAlbum(
  parentAlbumId: string,
  data: GallerySubAlbumInput,
): Promise<CreateSubAlbumResult> {
  const parent = await prisma.galleryAlbum.findUnique({
    where: { id: parentAlbumId },
    select: { id: true, parentAlbumId: true },
  })
  if (!parent) return { ok: false, reason: 'parent-not-found' }
  if (parent.parentAlbumId !== null) return { ok: false, reason: 'parent-not-top-level' }

  try {
    const album = await prisma.galleryAlbum.create({
      data: toAlbumCreateData(data, parent.id),
    })
    return { ok: true, album }
  } catch (error) {
    if (hasPrismaErrorCode(error, 'P2002')) return { ok: false, reason: 'duplicate-slug' }
    if (hasPrismaErrorCode(error, 'P2003')) return { ok: false, reason: 'parent-not-found' }
    throw error
  }
}

function toAlbumCreateData(data: GalleryAlbumFields, parentAlbumId: string | null) {
  return {
    slug: data.slug,
    title: data.title,
    description: data.description,
    yearsLabel: data.yearsLabel ?? null,
    coverObjectKey: data.coverObjectKey ?? null,
    parentAlbumId,
  }
}

function hasPrismaErrorCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code
}
