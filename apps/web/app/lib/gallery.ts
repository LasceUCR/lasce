/**
 * Mock content for the public gallery. The shape mirrors what a real source
 * (Postgres rows plus MinIO objects) would return, so wiring one in later is a
 * change to this module alone: every component below receives its data as
 * props or reads these exports directly.
 *
 * The images under `public/images/galeria/` are public-domain NASA placeholders
 * standing in for the laboratory's own photography; see the README there. They
 * are shared across albums on purpose, so the same file backs several entries.
 *
 * Counters are derived rather than written down. `albumMeta()` builds its
 * summary from the media actually present, so a page can never advertise a file
 * count it does not have.
 */

const imageBase = '/images/galeria'

/**
 * Alternative text keyed by image file, not by entry. Several entries share a
 * file on purpose (see the README under `public/images/galeria/`), and alt text
 * describes the pixels rather than the caption — so two entries pointing at the
 * same file must describe it identically. Keying the table by file makes that
 * impossible to get wrong, while `GalleryMedia.alt` stays required so a new
 * entry still has to make the decision.
 *
 * House rules: Spanish, one sentence, sentence case, ends with a period, and
 * describes what is visible. Never repeat `title` or `description`, and never
 * open with "Foto de" or "Imagen de" — the image role already says that.
 */
const mediaAlt = {
  'antena-cono-instalacion.jpg':
    'Una grúa suspende una estructura cónica metálica sobre el centro de una antena parabólica en construcción.',
  'antena-cuadripode.jpg':
    'Cuatro brazos metálicos forman un cuadrípode sobre el plato de una antena parabólica blanca.',
  'antena-goldstone-complejo.jpg':
    'Varias antenas parabólicas blancas repartidas por un valle desértico bajo un cielo despejado.',
  'antena-grua-plato.jpg':
    'Una grúa de gran altura sostiene en el aire el plato reflector de una antena junto a su pedestal.',
  'antena-hibrida-experimental.jpg':
    'Una antena parabólica apunta al cielo nocturno con un haz de luz proyectado desde su centro.',
  'antena-inicio-obras.jpg':
    'Maquinaria de obra remueve tierra en un terreno desértico al inicio de la construcción.',
  'antena-nueva-en-espera.jpg':
    'Un terreno desértico despejado y nivelado, con una antena parabólica al fondo.',
  'cimentacion-obra-01.jpg':
    'Obreros con casco trabajan sobre una parrilla de varilla de acero en una losa de concreto.',
  'cimentacion-obra-02.jpg':
    'Encofrado de madera y varilla de acero dispuestos sobre la excavación de una cimentación.',
  'cimentacion-obra-03.jpg':
    'Un camión mezclador vierte concreto en el encofrado de una cimentación circular.',
  'eclipse-corona-compuesta.jpg':
    'Composición sobre fondo negro con las fases sucesivas de un eclipse solar, desde el disco parcialmente cubierto hasta el anillo de corona.',
  'eclipse-parcial-01.jpg':
    'El disco solar cubierto en parte por la silueta negra de la Luna, en forma de media luna.',
  'eclipse-parcial-02.jpg':
    'La Luna avanza sobre el disco solar y deja una franja luminosa cada vez más delgada.',
  'eclipse-parcial-03.jpg':
    'Una fina franja del disco solar permanece visible junto al borde de la Luna.',
  'eclipse-totalidad-01.jpg':
    'La corona solar blanca rodea el disco lunar completamente negro durante la totalidad.',
  'eclipse-totalidad-02.jpg':
    'Filamentos de la corona solar se extienden alrededor del disco lunar oscuro.',
  'eclipse-totalidad-03.jpg':
    'El anillo de la corona solar brilla sobre un cielo completamente oscurecido.',
  'eclipse-totalidad-04.jpg':
    'Un punto rojizo de cromosfera asoma en el borde del disco lunar al final de la totalidad.',
  // Provenance unrecorded in the images README; description pending review by
  // someone who can see the file.
  'hank-bb.webp': 'Una persona del equipo trabaja junto a un banco de pruebas de laboratorio.',
  'instrumento-grua-montaje.jpg':
    'Una grúa de taller eleva un instrumento envuelto en lámina protectora sobre su mecanismo de montaje.',
  'instrumento-integracion.jpg':
    'Técnicos con traje blanco de sala limpia ensamblan un instrumento sobre una plataforma.',
  'instrumento-pruebas-radar.jpg':
    'Un conjunto de antenas de radar montado en un bastidor metálico durante una prueba en laboratorio.',
  'obra-terreno-01.jpg':
    'Un terreno en obra con maquinaria pesada y material de construcción apilado.',
  'obra-terreno-02.jpg':
    'Vista general de un terreno en movimiento de tierras, con huellas de maquinaria sobre el suelo.',
  'receptor-laboratorio-01.jpg':
    'Bancos de trabajo de un laboratorio de prototipos con instrumentos electrónicos y herramientas.',
  'receptor-laboratorio-02.jpg':
    'Una persona manipula una placa electrónica en un banco de laboratorio con equipo de medición.',
  'receptor-laboratorio-03.jpg':
    'Equipo de medición y cableado dispuestos sobre un banco de pruebas de laboratorio.',
  'receptor-laboratorio-04.jpg':
    'Detalle de un módulo electrónico abierto, con conectores y cableado a la vista.',
  'sala-control-01.jpg':
    'Varias personas siguen una operación desde consolas con pantallas en una sala de control.',
  'sala-control-02.jpg':
    'Filas de consolas ocupadas en una sala de control, con pantallas de seguimiento al fondo.',
  'sala-control-03.jpg':
    'Una persona con auricular observa los datos de una consola en una sala de control.',
  'taller-briefing.jpg':
    'Varias personas sentadas a una mesa durante una charla, con una pantalla de presentación al fondo.',
  'taller-estudiantes.jpg':
    'Un grupo de estudiantes atiende la explicación de un guía durante una visita.',
  'visita-estudiantes-01.jpg':
    'Un grupo de estudiantes recorre una instalación acompañado por personal técnico.',
  'visita-estudiantes-02.jpg':
    'Estudiantes observan un equipo de gran tamaño durante una visita guiada.',
  'visita-estudiantes-03.jpg':
    'Estudiantes escuchan a una persona del equipo frente a un panel informativo.',
  'visita-estudiantes-04.jpg':
    'Un grupo numeroso de estudiantes reunido para un retrato de grupo en una instalación.',
} as const

export interface GalleryMedia {
  id: string
  title: string
  description: string
  /**
   * What the image actually shows, for anyone who cannot see it. Read by the
   * lightbox, where the file is the content; the grid and the album tiles
   * render their images decoratively because a control already names them.
   * Always drawn from `mediaAlt` above, so entries sharing a file agree.
   */
  alt: string
  /** Capture date, already formatted for display in Spanish. */
  date: string
  /** File format as shown to visitors: JPG, MP4, PNG, FITS… */
  format: string
  uploader: string
  isVideo: boolean
  /** Tile footprint in the masonry grid. */
  colSpan: 1 | 2
  rowSpan: 1 | 2
  /** Optional: a file still awaiting upload renders the placeholder frame. */
  src?: string
}

export interface GallerySubAlbum {
  slug: string
  title: string
  description: string
  media: readonly GalleryMedia[]
  src?: string
}

export interface GalleryAlbum {
  slug: string
  title: string
  description: string
  /** Period the album covers, e.g. '2025–2026'. Part of the summary line. */
  years: string
  subAlbums: readonly GallerySubAlbum[]
  media: readonly GalleryMedia[]
  src?: string
}

export const albumSlugs = ['rosac', 'laboratorio', 'eclipse'] as const

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

const rosacMedia = [
  {
    id: 'rosac-01',
    title: 'Llegada de los componentes del ROSAC',
    description: 'Descarga del contenedor con las piezas del reflector principal.',
    alt: mediaAlt['antena-nueva-en-espera.jpg'],
    date: '15 ene 2025',
    format: 'JPG',
    uploader: 'Andrés Solano',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/antena-nueva-en-espera.jpg`,
  },
  {
    id: 'rosac-02',
    title: 'Ensamblaje del reflector parabólico',
    description: 'Registro en video del armado de los paneles del reflector.',
    alt: mediaAlt['antena-grua-plato.jpg'],
    date: '22 ene 2025',
    format: 'MP4',
    uploader: 'Fabián Alvarado',
    isVideo: true,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/antena-grua-plato.jpg`,
  },
  {
    id: 'rosac-03',
    title: 'Cimentación de la plataforma',
    description: 'Vaciado de concreto para la base de la antena.',
    alt: mediaAlt['cimentacion-obra-01.jpg'],
    date: '3 feb 2025',
    format: 'JPG',
    uploader: 'María Rodríguez',
    isVideo: false,
    colSpan: 1,
    rowSpan: 2,
    src: `${imageBase}/cimentacion-obra-01.jpg`,
  },
  {
    id: 'rosac-04',
    title: 'Instalación del mástil de soporte',
    description: 'Colocación del mástil central antes del montaje del reflector.',
    alt: mediaAlt['antena-cuadripode.jpg'],
    date: '10 feb 2025',
    format: 'JPG',
    uploader: 'Andrés Solano',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/antena-cuadripode.jpg`,
  },
  {
    id: 'rosac-05',
    title: 'Cableado del sistema RF',
    description: 'Tendido de cables de radiofrecuencia hacia la sala de control.',
    alt: mediaAlt['receptor-laboratorio-02.jpg'],
    date: '18 feb 2025',
    format: 'PNG',
    uploader: 'Fabián Alvarado',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/receptor-laboratorio-02.jpg`,
  },
  {
    id: 'rosac-06',
    title: 'Prueba del receptor de banda X',
    description: 'Verificación del receptor antes de la instalación final.',
    alt: mediaAlt['receptor-laboratorio-01.jpg'],
    date: '1 mar 2025',
    format: 'MP4',
    uploader: 'María Rodríguez',
    isVideo: true,
    colSpan: 1,
    rowSpan: 2,
    src: `${imageBase}/receptor-laboratorio-01.jpg`,
  },
  {
    id: 'rosac-07',
    title: 'Alineación óptica del reflector',
    description: 'Ajuste fino de la orientación del reflector principal.',
    alt: mediaAlt['antena-cono-instalacion.jpg'],
    date: '9 mar 2025',
    format: 'JPG',
    uploader: 'Andrés Solano',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/antena-cono-instalacion.jpg`,
  },
  {
    id: 'rosac-08',
    title: 'Captura de calibración',
    description: 'Datos crudos de calibración del receptor en formato FITS.',
    alt: mediaAlt['instrumento-pruebas-radar.jpg'],
    date: '15 mar 2025',
    format: 'FITS',
    uploader: 'Fabián Alvarado',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/instrumento-pruebas-radar.jpg`,
  },
  {
    id: 'rosac-09',
    title: 'Equipo de campo en el sitio',
    description: 'El equipo técnico durante una jornada de trabajo en sitio.',
    alt: mediaAlt['obra-terreno-01.jpg'],
    date: '20 mar 2025',
    format: 'JPG',
    uploader: 'María Rodríguez',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/obra-terreno-01.jpg`,
  },
  {
    id: 'rosac-10',
    title: 'Conexión con la sala de control',
    description: 'Prueba de enlace entre la antena y la sala de control.',
    alt: mediaAlt['sala-control-01.jpg'],
    date: '2 abr 2025',
    format: 'MP4',
    uploader: 'Andrés Solano',
    isVideo: true,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/sala-control-01.jpg`,
  },
  {
    id: 'rosac-11',
    title: 'Primera señal recibida',
    description: 'El equipo confirma la primera recepción de datos del ROSAC.',
    alt: mediaAlt['sala-control-02.jpg'],
    date: '18 abr 2025',
    format: 'JPG',
    uploader: 'Fabián Alvarado',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/sala-control-02.jpg`,
  },
  {
    id: 'rosac-12',
    title: 'Panorámica del sitio al atardecer',
    description: 'Vista general del observatorio al finalizar la instalación.',
    alt: mediaAlt['antena-goldstone-complejo.jpg'],
    date: '30 abr 2025',
    format: 'JPG',
    uploader: 'María Rodríguez',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/antena-goldstone-complejo.jpg`,
  },
  {
    id: 'rosac-13',
    title: 'Placa de inauguración',
    description: 'Colocación de la placa conmemorativa del ROSAC.',
    alt: mediaAlt['antena-hibrida-experimental.jpg'],
    date: '5 may 2025',
    format: 'JPG',
    uploader: 'Andrés Solano',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/antena-hibrida-experimental.jpg`,
  },
] as const satisfies readonly GalleryMedia[]

const cimentacionMedia = [
  {
    id: 'cimentacion-01',
    title: 'Replanteo del terreno',
    description: 'Marcado de la huella de la antena sobre el terreno despejado.',
    alt: mediaAlt['obra-terreno-01.jpg'],
    date: '8 ene 2025',
    format: 'JPG',
    uploader: 'María Rodríguez',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/obra-terreno-01.jpg`,
  },
  {
    id: 'cimentacion-02',
    title: 'Excavación de la base',
    description: 'Apertura del pozo que alojará el pedestal de la antena.',
    alt: mediaAlt['cimentacion-obra-02.jpg'],
    date: '12 ene 2025',
    format: 'JPG',
    uploader: 'Andrés Solano',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/cimentacion-obra-02.jpg`,
  },
  {
    id: 'cimentacion-03',
    title: 'Armado del acero de refuerzo',
    description: 'Colocación de la parrilla de varilla antes del vaciado.',
    alt: mediaAlt['cimentacion-obra-03.jpg'],
    date: '20 ene 2025',
    format: 'JPG',
    uploader: 'Fabián Alvarado',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/cimentacion-obra-03.jpg`,
  },
  {
    id: 'cimentacion-04',
    title: 'Vaciado del concreto',
    description: 'Colado continuo de la losa de cimentación durante la mañana.',
    alt: mediaAlt['cimentacion-obra-01.jpg'],
    date: '3 feb 2025',
    format: 'MP4',
    uploader: 'María Rodríguez',
    isVideo: true,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/cimentacion-obra-01.jpg`,
  },
  {
    id: 'cimentacion-05',
    title: 'Curado de la losa',
    description: 'Control de fraguado durante los primeros días.',
    alt: mediaAlt['obra-terreno-02.jpg'],
    date: '9 feb 2025',
    format: 'JPG',
    uploader: 'Andrés Solano',
    isVideo: false,
    colSpan: 1,
    rowSpan: 2,
    src: `${imageBase}/obra-terreno-02.jpg`,
  },
  {
    id: 'cimentacion-06',
    title: 'Izado del pedestal',
    description: 'La grúa coloca el pedestal sobre la base ya curada.',
    alt: mediaAlt['antena-grua-plato.jpg'],
    date: '17 feb 2025',
    format: 'JPG',
    uploader: 'Fabián Alvarado',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/antena-grua-plato.jpg`,
  },
  {
    id: 'cimentacion-07',
    title: 'Montaje del cuadrípode',
    description: 'Instalación de la estructura que sostiene el subreflector.',
    alt: mediaAlt['antena-cuadripode.jpg'],
    date: '24 feb 2025',
    format: 'JPG',
    uploader: 'María Rodríguez',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/antena-cuadripode.jpg`,
  },
  {
    id: 'cimentacion-08',
    title: 'Antena montada sobre su base',
    description: 'La estructura completa, lista para el trabajo de instrumentación.',
    alt: mediaAlt['antena-inicio-obras.jpg'],
    date: '2 mar 2025',
    format: 'JPG',
    uploader: 'Andrés Solano',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/antena-inicio-obras.jpg`,
  },
] as const satisfies readonly GalleryMedia[]

const receptorMedia = [
  {
    id: 'receptor-01',
    title: 'Banco de pruebas del receptor',
    description: 'Montaje del receptor de banda X en el banco del laboratorio.',
    alt: mediaAlt['receptor-laboratorio-01.jpg'],
    date: '25 feb 2025',
    format: 'JPG',
    uploader: 'Fabián Alvarado',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/receptor-laboratorio-01.jpg`,
  },
  {
    id: 'receptor-02',
    title: 'Medición de figura de ruido',
    description: 'Caracterización del amplificador de bajo ruido.',
    alt: mediaAlt['receptor-laboratorio-02.jpg'],
    date: '28 feb 2025',
    format: 'JPG',
    uploader: 'María Rodríguez',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/receptor-laboratorio-02.jpg`,
  },
  {
    id: 'receptor-03',
    title: 'Integración de la cadena de RF',
    description: 'Ensamblaje de filtros, mezcladores y amplificadores.',
    alt: mediaAlt['receptor-laboratorio-03.jpg'],
    date: '5 mar 2025',
    format: 'JPG',
    uploader: 'Andrés Solano',
    isVideo: false,
    colSpan: 1,
    rowSpan: 2,
    src: `${imageBase}/receptor-laboratorio-03.jpg`,
  },
  {
    id: 'receptor-04',
    title: 'Prueba de estabilidad térmica',
    description: 'Registro en video de la deriva del receptor durante ocho horas.',
    alt: mediaAlt['receptor-laboratorio-04.jpg'],
    date: '11 mar 2025',
    format: 'MP4',
    uploader: 'Fabián Alvarado',
    isVideo: true,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/receptor-laboratorio-04.jpg`,
  },
  {
    id: 'receptor-05',
    title: 'Integración con el sistema de adquisición',
    description: 'Conexión del receptor al digitalizador y al servidor de datos.',
    alt: mediaAlt['instrumento-integracion.jpg'],
    date: '18 mar 2025',
    format: 'JPG',
    uploader: 'María Rodríguez',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/instrumento-integracion.jpg`,
  },
  {
    id: 'receptor-06',
    title: 'Instalación del receptor en la antena',
    description: 'Traslado y montaje del conjunto en el foco del reflector.',
    alt: mediaAlt['instrumento-grua-montaje.jpg'],
    date: '26 mar 2025',
    format: 'JPG',
    uploader: 'Andrés Solano',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/instrumento-grua-montaje.jpg`,
  },
] as const satisfies readonly GalleryMedia[]

const calibracionMedia = [
  {
    id: 'calibracion-01',
    title: 'Apuntado a una fuente de referencia',
    description: 'Primer barrido sobre una radiofuente conocida.',
    alt: mediaAlt['instrumento-pruebas-radar.jpg'],
    date: '2 abr 2025',
    format: 'JPG',
    uploader: 'María Rodríguez',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/instrumento-pruebas-radar.jpg`,
  },
  {
    id: 'calibracion-02',
    title: 'Corrección del modelo de apuntado',
    description: 'Ajuste de los coeficientes tras el barrido de referencia.',
    alt: mediaAlt['sala-control-03.jpg'],
    date: '7 abr 2025',
    format: 'JPG',
    uploader: 'Fabián Alvarado',
    isVideo: false,
    colSpan: 1,
    rowSpan: 2,
    src: `${imageBase}/sala-control-03.jpg`,
  },
  {
    id: 'calibracion-03',
    title: 'Calibración en la sala de control',
    description: 'Seguimiento de la sesión desde las consolas de operación.',
    alt: mediaAlt['sala-control-01.jpg'],
    date: '10 abr 2025',
    format: 'JPG',
    uploader: 'Andrés Solano',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/sala-control-01.jpg`,
  },
  {
    id: 'calibracion-04',
    title: 'Sesión de seguimiento continuo',
    description: 'Registro en video de un seguimiento de doce horas.',
    alt: mediaAlt['sala-control-02.jpg'],
    date: '14 abr 2025',
    format: 'MP4',
    uploader: 'María Rodríguez',
    isVideo: true,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/sala-control-02.jpg`,
  },
  {
    id: 'calibracion-05',
    title: 'Verificación del patrón de radiación',
    description: 'Comparación del lóbulo medido con el diseño teórico.',
    alt: mediaAlt['antena-hibrida-experimental.jpg'],
    date: '22 abr 2025',
    format: 'FITS',
    uploader: 'Fabián Alvarado',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/antena-hibrida-experimental.jpg`,
  },
  {
    id: 'calibracion-06',
    title: 'Antena lista para operación',
    description: 'Cierre del proceso de alineación y entrega a operaciones.',
    alt: mediaAlt['antena-goldstone-complejo.jpg'],
    date: '29 abr 2025',
    format: 'JPG',
    uploader: 'Andrés Solano',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/antena-goldstone-complejo.jpg`,
  },
] as const satisfies readonly GalleryMedia[]

const laboratorioMedia = [
  {
    id: 'laboratorio-01',
    title: 'Jornada de trabajo en el laboratorio',
    description: 'El equipo revisa instrumentación en el banco principal.',
    alt: mediaAlt['receptor-laboratorio-03.jpg'],
    date: '14 ene 2026',
    format: 'JPG',
    uploader: 'María Rodríguez',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/receptor-laboratorio-03.jpg`,
  },
  {
    id: 'hank-bb',
    title: 'Física de laboratorio: Hank y el banco de pruebas',
    description: 'Jefe de laboratorio supervisa la integración del receptor.',
    alt: mediaAlt['hank-bb.webp'],
    date: '14 ene 2026',
    format: 'JPG',
    uploader: 'María Rodríguez',
    isVideo: false,
    colSpan: 1,
    rowSpan: 2,
    src: `${imageBase}/hank-bb.webp`,
  },
  {
    id: 'laboratorio-02',
    title: 'Reunión semanal del equipo',
    description: 'Puesta en común del avance de cada línea de trabajo.',
    alt: mediaAlt['taller-briefing.jpg'],
    date: '21 ene 2026',
    format: 'JPG',
    uploader: 'Andrés Solano',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/taller-briefing.jpg`,
  },
  {
    id: 'laboratorio-03',
    title: 'Preparación de un experimento',
    description: 'Montaje del arreglo antes de una sesión de medición.',
    alt: mediaAlt['instrumento-integracion.jpg'],
    date: '4 feb 2026',
    format: 'JPG',
    uploader: 'Fabián Alvarado',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/instrumento-integracion.jpg`,
  },
  {
    id: 'laboratorio-04',
    title: 'Turno de operación nocturno',
    description: 'Registro en video de una guardia de observación.',
    alt: mediaAlt['sala-control-03.jpg'],
    date: '19 feb 2026',
    format: 'MP4',
    uploader: 'María Rodríguez',
    isVideo: true,
    colSpan: 1,
    rowSpan: 2,
    src: `${imageBase}/sala-control-03.jpg`,
  },
  {
    id: 'laboratorio-05',
    title: 'Mantenimiento del instrumental',
    description: 'Revisión periódica de los equipos del laboratorio.',
    alt: mediaAlt['receptor-laboratorio-04.jpg'],
    date: '10 mar 2026',
    format: 'JPG',
    uploader: 'Andrés Solano',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/receptor-laboratorio-04.jpg`,
  },
  {
    id: 'laboratorio-06',
    title: 'Fotografía del equipo completo',
    description: 'Retrato del personal del laboratorio al cierre del semestre.',
    alt: mediaAlt['visita-estudiantes-03.jpg'],
    date: '27 mar 2026',
    format: 'JPG',
    uploader: 'Fabián Alvarado',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/visita-estudiantes-03.jpg`,
  },
] as const satisfies readonly GalleryMedia[]

const visitasMedia = [
  {
    id: 'visitas-01',
    title: 'Recibimiento de un grupo escolar',
    description: 'Bienvenida a estudiantes de secundaria en la entrada del laboratorio.',
    alt: mediaAlt['visita-estudiantes-01.jpg'],
    date: '6 feb 2026',
    format: 'JPG',
    uploader: 'María Rodríguez',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/visita-estudiantes-01.jpg`,
  },
  {
    id: 'visitas-02',
    title: 'Recorrido por la sala de instrumentación',
    description: 'Explicación del funcionamiento del receptor a las personas visitantes.',
    alt: mediaAlt['visita-estudiantes-02.jpg'],
    date: '6 feb 2026',
    format: 'JPG',
    uploader: 'Andrés Solano',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/visita-estudiantes-02.jpg`,
  },
  {
    id: 'visitas-03',
    title: 'Demostración de observación en vivo',
    description: 'El grupo observa una sesión de adquisición de datos.',
    alt: mediaAlt['sala-control-01.jpg'],
    date: '20 feb 2026',
    format: 'MP4',
    uploader: 'Fabián Alvarado',
    isVideo: true,
    colSpan: 1,
    rowSpan: 2,
    src: `${imageBase}/sala-control-01.jpg`,
  },
  {
    id: 'visitas-04',
    title: 'Preguntas del público',
    description: 'Espacio de consultas al cierre del recorrido.',
    alt: mediaAlt['visita-estudiantes-03.jpg'],
    date: '20 feb 2026',
    format: 'JPG',
    uploader: 'María Rodríguez',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/visita-estudiantes-03.jpg`,
  },
  {
    id: 'visitas-05',
    title: 'Visita universitaria',
    description: 'Estudiantes de ingeniería eléctrica recorren el laboratorio.',
    alt: mediaAlt['visita-estudiantes-04.jpg'],
    date: '13 mar 2026',
    format: 'JPG',
    uploader: 'Andrés Solano',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/visita-estudiantes-04.jpg`,
  },
  {
    id: 'visitas-06',
    title: 'Cierre de la jornada de puertas abiertas',
    description: 'Fotografía de grupo al finalizar la actividad.',
    alt: mediaAlt['taller-estudiantes.jpg'],
    date: '13 mar 2026',
    format: 'JPG',
    uploader: 'Fabián Alvarado',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/taller-estudiantes.jpg`,
  },
] as const satisfies readonly GalleryMedia[]

const talleresMedia = [
  {
    id: 'talleres-01',
    title: 'Taller de introducción a la radioastronomía',
    description: 'Sesión teórica de apertura del taller.',
    alt: mediaAlt['taller-briefing.jpg'],
    date: '4 mar 2026',
    format: 'JPG',
    uploader: 'María Rodríguez',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/taller-briefing.jpg`,
  },
  {
    id: 'talleres-02',
    title: 'Práctica de análisis de datos',
    description: 'Las personas participantes procesan un conjunto de datos real.',
    alt: mediaAlt['taller-estudiantes.jpg'],
    date: '4 mar 2026',
    format: 'JPG',
    uploader: 'Andrés Solano',
    isVideo: false,
    colSpan: 1,
    rowSpan: 2,
    src: `${imageBase}/taller-estudiantes.jpg`,
  },
  {
    id: 'talleres-03',
    title: 'Capacitación en operación del ROSAC',
    description: 'Entrenamiento del personal en los procedimientos de operación.',
    alt: mediaAlt['sala-control-02.jpg'],
    date: '18 mar 2026',
    format: 'MP4',
    uploader: 'Fabián Alvarado',
    isVideo: true,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/sala-control-02.jpg`,
  },
  {
    id: 'talleres-04',
    title: 'Construcción de una antena didáctica',
    description: 'Actividad práctica de armado de una antena de bajo costo.',
    alt: mediaAlt['visita-estudiantes-02.jpg'],
    date: '25 mar 2026',
    format: 'JPG',
    uploader: 'María Rodríguez',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/visita-estudiantes-02.jpg`,
  },
  {
    id: 'talleres-05',
    title: 'Entrega de constancias',
    description: 'Cierre del ciclo de capacitación del primer semestre.',
    alt: mediaAlt['visita-estudiantes-04.jpg'],
    date: '25 mar 2026',
    format: 'JPG',
    uploader: 'Andrés Solano',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/visita-estudiantes-04.jpg`,
  },
] as const satisfies readonly GalleryMedia[]

const eclipseMedia = [
  {
    id: 'eclipse-01',
    title: 'Montaje del equipo de observación',
    description: 'Preparación de los telescopios con filtro solar en el campus.',
    alt: mediaAlt['taller-briefing.jpg'],
    date: '8 abr 2026',
    format: 'JPG',
    uploader: 'Andrés Solano',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/taller-briefing.jpg`,
  },
  {
    id: 'eclipse-02',
    title: 'Primer contacto',
    description: 'La Luna comienza a cubrir el disco solar.',
    alt: mediaAlt['eclipse-parcial-01.jpg'],
    date: '8 abr 2026',
    format: 'JPG',
    uploader: 'María Rodríguez',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/eclipse-parcial-01.jpg`,
  },
  {
    id: 'eclipse-03',
    title: 'Fase parcial avanzada',
    description: 'El disco solar reducido a una franja delgada.',
    alt: mediaAlt['eclipse-parcial-02.jpg'],
    date: '8 abr 2026',
    format: 'JPG',
    uploader: 'Fabián Alvarado',
    isVideo: false,
    colSpan: 1,
    rowSpan: 2,
    src: `${imageBase}/eclipse-parcial-02.jpg`,
  },
  {
    id: 'eclipse-04',
    title: 'Totalidad',
    description: 'La corona solar visible durante los minutos de totalidad.',
    alt: mediaAlt['eclipse-totalidad-01.jpg'],
    date: '8 abr 2026',
    format: 'JPG',
    uploader: 'Andrés Solano',
    isVideo: false,
    colSpan: 2,
    rowSpan: 2,
    src: `${imageBase}/eclipse-totalidad-01.jpg`,
  },
  {
    id: 'eclipse-05',
    title: 'Detalle de la corona',
    description: 'Estructura de la corona registrada con teleobjetivo.',
    alt: mediaAlt['eclipse-totalidad-02.jpg'],
    date: '8 abr 2026',
    format: 'JPG',
    uploader: 'María Rodríguez',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/eclipse-totalidad-02.jpg`,
  },
  {
    id: 'eclipse-06',
    title: 'Secuencia completa del eclipse',
    description: 'Registro en video de la evolución del fenómeno.',
    alt: mediaAlt['eclipse-totalidad-03.jpg'],
    date: '8 abr 2026',
    format: 'MP4',
    uploader: 'Fabián Alvarado',
    isVideo: true,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/eclipse-totalidad-03.jpg`,
  },
  {
    id: 'eclipse-07',
    title: 'Composición de fases',
    description: 'Montaje de las fases sucesivas sobre una misma imagen.',
    alt: mediaAlt['eclipse-corona-compuesta.jpg'],
    date: '8 abr 2026',
    format: 'PNG',
    uploader: 'Andrés Solano',
    isVideo: false,
    colSpan: 1,
    rowSpan: 2,
    src: `${imageBase}/eclipse-corona-compuesta.jpg`,
  },
  {
    id: 'eclipse-08',
    title: 'Último contacto',
    description: 'El disco solar reaparece por completo.',
    alt: mediaAlt['eclipse-parcial-03.jpg'],
    date: '8 abr 2026',
    format: 'JPG',
    uploader: 'María Rodríguez',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/eclipse-parcial-03.jpg`,
  },
  {
    id: 'eclipse-09',
    title: 'Público observando desde el campus',
    description: 'Estudiantes y visitantes siguen el eclipse con lentes certificados.',
    alt: mediaAlt['eclipse-totalidad-04.jpg'],
    date: '8 abr 2026',
    format: 'JPG',
    uploader: 'Fabián Alvarado',
    isVideo: false,
    colSpan: 2,
    rowSpan: 1,
    src: `${imageBase}/eclipse-totalidad-04.jpg`,
  },
  {
    id: 'eclipse-10',
    title: 'Cierre de la jornada de observación',
    description: 'El equipo desmonta los instrumentos al final de la tarde.',
    alt: mediaAlt['visita-estudiantes-01.jpg'],
    date: '8 abr 2026',
    format: 'JPG',
    uploader: 'Andrés Solano',
    isVideo: false,
    colSpan: 1,
    rowSpan: 1,
    src: `${imageBase}/visita-estudiantes-01.jpg`,
  },
] as const satisfies readonly GalleryMedia[]

export const galleryAlbums = {
  rosac: {
    slug: 'rosac',
    title: 'Construcción del ROSAC',
    description:
      'Documentación del ensamblaje y puesta en marcha del Radio Observatorio Solar y de Clima Espacial (ROSAC).',
    years: '2025–2026',
    src: `${imageBase}/antena-goldstone-complejo.jpg`,
    subAlbums: [
      {
        slug: 'cimentacion',
        title: 'Cimentación e instalación de la antena',
        description: 'Obra civil, montaje del pedestal y levantamiento de la estructura.',
        src: `${imageBase}/cimentacion-obra-01.jpg`,
        media: cimentacionMedia,
      },
      {
        slug: 'receptor',
        title: 'Pruebas del receptor',
        description: 'Caracterización e integración de la cadena de radiofrecuencia.',
        src: `${imageBase}/receptor-laboratorio-01.jpg`,
        media: receptorMedia,
      },
      {
        slug: 'calibracion',
        title: 'Alineación y calibración',
        description: 'Ajuste del apuntado y verificación del patrón de radiación.',
        src: `${imageBase}/sala-control-01.jpg`,
        media: calibracionMedia,
      },
    ],
    media: rosacMedia,
  },
  laboratorio: {
    slug: 'laboratorio',
    title: 'Actividades del laboratorio',
    description: 'Visitas guiadas, talleres y trabajo cotidiano del equipo de LASCE.',
    years: '2026',
    src: `${imageBase}/receptor-laboratorio-03.jpg`,
    subAlbums: [
      {
        slug: 'visitas',
        title: 'Visitas guiadas',
        description: 'Recorridos de grupos escolares y universitarios por el laboratorio.',
        src: `${imageBase}/visita-estudiantes-01.jpg`,
        media: visitasMedia,
      },
      {
        slug: 'talleres',
        title: 'Talleres y capacitación',
        description: 'Formación práctica en radioastronomía y operación del ROSAC.',
        src: `${imageBase}/taller-estudiantes.jpg`,
        media: talleresMedia,
      },
    ],
    media: laboratorioMedia,
  },
  eclipse: {
    slug: 'eclipse',
    title: 'Eclipse solar del 8 de abril',
    description: 'Observación y registro del eclipse desde el campus.',
    years: 'abril 2026',
    src: `${imageBase}/eclipse-totalidad-01.jpg`,
    subAlbums: [],
    media: eclipseMedia,
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
