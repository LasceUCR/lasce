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

export interface GalleryMedia {
  id: string
  title: string
  description: string
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
