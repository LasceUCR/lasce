export const noticiasMeta = {
  title: 'Noticias | LASCE',
  description:
    'Noticias y cobertura mediática del Laboratorio de Astrofísica Solar y Clima Espacial de la Universidad de Costa Rica.',
} as const

export const noticiasHero = {
  kicker: 'Portal público LASCE',
  title: 'Noticias y cobertura mediática',
  lead: 'Noticias, divulgación y cobertura sobre el trabajo del LASCE.',
} as const

export const noticiasBackLink = {
  href: '/',
  label: 'Volver al inicio',
} as const

export type NewsArticle = {
  slug: string
  title: string
  authors: string
  source: string
  date: string
  abstract: string
  href: string
}

// Mock data for news articles till the backend is ready. Sourced from a Word
// document provided by Dr. Carolina Salas-Matamoros, containing media coverage
// and institutional references related to LASCE and ROSAC. The records retain
// the titles, media outlets, publication dates, and source links provided in
// the document.
export const news: NewsArticle[] = [
  {
    slug: 'como-que-aqui-no-pasa-nada-cinco-proyectos-cientificos',
    title:
      '¿Cómo que aquí no pasa nada? Cinco proyectos científicos para entusiasmarse en Costa Rica',
    authors: 'Jorge Arturo Mora',
    source: 'La Nación – Revista Dominical',
    date: '24 de mayo de 2026',
    abstract:
      'Reportaje sobre proyectos científicos costarricenses, entre ellos ROSAC, el radiotelescopio de la Universidad de Costa Rica dedicado al estudio de la actividad solar.',
    href:
      'https://www.nacion.com/revista-dominical/como-que-aqui-no-pasa-nada-cinco-proyectos/CZAKRKAEDJE7DPTMVO52LFBZQQ/story/',
  },
  {
    slug: 'vale-la-pena-invertir-en-ciencia',
    title:
      '¿Vale la pena invertir en ciencia? Estos proyectos costarricenses son la respuesta',
    authors: 'Leonardo Garnier',
    source: 'La Nación – Opinión (Leonardo Garnier)',
    date: '28 de mayo de 2026',
    abstract:
      'Artículo de opinión que destaca a ROSAC como ejemplo de investigación científica costarricense y de la importancia de la inversión pública en ciencia.',
    href:
      'https://www.nacion.com/opinion/columnistas/vale-la-pena-invertir-en-ciencia-estos-proyectos/ILX4QIPB6JGHBCJ6QB34QRGY2A/story/',
  },
  {
    slug: 'cientificos-ucr-monitorean-actividad-solar-delfino',
    title:
      'Científicos de la UCR monitorean la actividad solar para estudiar el impacto del clima espacial en el país',
    authors: 'Alonso Martinez',
    source: 'Delfino.cr',
    date: '5 de diciembre de 2025',
    abstract:
      'Un proyecto de la UCR busca generar datos propios sobre la actividad solar y desarrollar herramientas para estudiar y predecir el impacto del clima espacial en Costa Rica.',
    href:
      'https://delfino.cr/2025/12/cientificos-de-la-ucr-monitorean-la-actividad-solar-para-estudiar-el-impacto-del-clima-espacial-en-el-pais',
  },
  {
    slug: 'cientificos-ucr-monitorean-actividad-solar-ucr',
    authors: 'Tatiana Carmona Rizo',
    title:
      'Científicos de la UCR monitorean la actividad solar para estudiar el impacto del clima espacial en nuestro país',
    source: 'Universidad de Costa Rica (UCR)',
    date: '5 de diciembre de 2025',
    abstract:
      'La UCR presenta un proyecto interdisciplinario para estudiar la actividad solar y sus efectos sobre Costa Rica mediante observaciones, instrumentación científica y herramientas computacionales.',
    href:
      'https://www.ucr.ac.cr/noticias/2025/12/05/cientificos-de-la-ucr-monitorean-la-actividad-solar-para-estudiar-el-impacto-del-clima-espacial-en-nuestro-pais.html',
  },
  {
    slug: 'ucr-radiotelescopio-investigar-sol',
    title: 'UCR pone en funcionamiento radiotelescopio para investigar el Sol',
    authors: 'Gerardo Quesada A.',
    source: 'El Norte Hoy',
    date: '2 de octubre de 2023',
    abstract:
      'ROSAC, el radiotelescopio del Radio Observatorio de Santa Cruz, permitirá monitorear la radiación solar durante las 24 horas y generar datos para investigaciones científicas.',
    href:
      'https://elnortehoycr.com/2023/10/02/ucr-pone-en-funcionamiento-radiotelescopio-para-investigar-el-sol/',
  },
  {
    slug: 'ucr-contara-con-radiotelescopio-explorar-cosmos',
    title: 'UCR contará con su propio radiotelescopio para explorar el cosmos',
    authors: 'Manrique Vindas Segura',
    source: 'Universidad de Costa Rica (UCR)',
    date: '5 de junio de 2017',
    abstract:
      'Un proyecto de investigación de la UCR estudia la transformación de una gran antena instalada en la Finca Experimental de Santa Cruz en un radiotelescopio para estudiar los astros.',
    href:
      'https://vinv.ucr.ac.cr/es/noticias/ucr-contara-con-su-propio-radiotelescopio-para-explorar-el-cosmos',
  },
  {
    slug: 'prysmian-dona-cables-radiotelescopio-rosac',
    title:
      'Prysmian dona $36.000 en cables de energía y telecomunicaciones para el desarrollo del único radio telescopio solar de su tipo en Centroamérica',
    authors: 'Prysmian',
    source: 'Prysmian Pro',
    date: '2023',
    abstract:
      'Prysmian donó cerca de tres kilómetros de cables de energía y telecomunicaciones para apoyar el desarrollo y puesta en funcionamiento del radiotelescopio solar ROSAC.',
    href:
      'https://prysmianpro.com/en/prysmian-group-dona-36-000-en-cables-de-energia-y-telecomunicaciones-para-el-desarrollo-del-unico-radio-telescopio-solar-de-su-tipo-en-centroamerica/',
  },
  {
    slug: 'prysmian-informe-actividades-2023',
    title: 'Informe de Actividades 2023 – Acciones destacadas',
    authors: 'Prysmian',
    source: 'Prysmian – Informe de Actividades LATAM',
    date: '2023',
    abstract:
      'Informe de Prysmian que destaca a ROSAC entre las alianzas estratégicas e iniciativas de impacto social de la compañía.',
    href:
      'https://br.prysmian.com/sites/br.prysmian.com/files/2024-07/Prysmian_RA23_ES-02-00_0.pdf',
  },
  {
    slug: 'impacto-social-prysmian-transicion-energetica',
    title: 'El impacto social de Prysmian en la era de la transición energética',
    authors: 'Prysmian',
    source: 'Prysmian Pro',
    date: 's. f.',
    abstract:
      'Artículo sobre el impacto social y educativo de Prysmian que menciona al proyecto del radiotelescopio solar ROSAC como una iniciativa de educación, inclusión y sostenibilidad.',
    href:
      'https://prysmianpro.com/el-impacto-social-de-prysmian-en-la-era-de-la-transicion-energetica/',
  },
  {
    slug: 'radiotelescopio-guanacaste-estudiar-sol-racsa',
    title: 'Radiotelescopio en Guanacaste para estudiar el Sol',
    authors: 'Mercadeo RACSA',
    source: 'RACSA',
    date: '20 de mayo de 2022',
    abstract:
      'RACSA presenta el radiotelescopio de ROSAC y su objetivo de estudiar el Sol mediante la medición de ondas de radio, destacando su carácter pionero en Costa Rica y Centroamérica.',
    href:
      'https://www.racsa.go.cr/blog/radiotelescopio-en-guanacaste-para-estudiar-el-sol/',
  },
  {
    slug: 'radiotelescopio-guanacaste-apunta-sol',
    title:
      'Radiotelescopio en Guanacaste apunta hacia el Sol para ayudar a revelar sus secretos',
    authors: 'Francisco Ruiz León',
    source: 'El Financiero',
    date: '17 de marzo de 2022',
    abstract:
      'El radiotelescopio de ROSAC busca generar datos locales que permitan estudiar cómo las ondas solares pueden afectar sistemas como radares y telecomunicaciones en Costa Rica.',
    href:
      'https://www.elfinancierocr.com/tecnologia/radiotelescopio-en-guanacaste-apunta-hacia-el-sol/XP3IRSKZVJDWTGUBZH5R2S6GKE/story/',
  },
  {
    slug: 'ucr-instala-radiotelescopio-guanacaste',
    title:
      'UCR instala radiotelescopio en Guanacaste con antena parabólica donada por Racsa',
    authors: 'Johnny Castro',
    source: 'La República',
    date: '10 de febrero de 2022',
    abstract:
      'La UCR inició el montaje de ROSAC en Guanacaste utilizando una antena parabólica donada por RACSA y adaptada para realizar observaciones solares.',
    href:
      'https://origin.larepublica.net/noticia/ucr-instala-radiotelescopio-en-guanacaste-con-antena-parabolica-donada-por-racsa',
  },
]
