/**
 * Initial data for the research table. The scope of the sprint (6-september-2026) was not
 * to create a full CRUD, so this seed is just temporary to populate the research table until the
 * CMS is done.
 */
import { fileURLToPath } from 'node:url'

import { config as loadEnv } from 'dotenv'

loadEnv({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true })

const { prisma } = await import('../src/index.js')

type SeedResearch = {
  title: string
  publicationDate: Date
  publisher: string
  authors: string[]
  abstract: string
  externalUrl: string
  doi?: string
}

const researchRecords: SeedResearch[] = [
  {
    title:
      'The Santa Cruz Radio Observatory (ROSAC): the first radio astronomy facility in Costa Rica',
    publicationDate: new Date('2026-07-05'),
    publisher: 'Proceedings of SPIE, Vol. 14151',
    authors: [
      'David M. Gale',
      'Carolina Salas-Matamoros',
      'Miguel Velázquez',
      'Wagner Mejías',
      'Gustavo Lara',
      'Andrés Fallas',
      'Federico Ruíz',
      'Óscar Núñez',
      'Eduardo Ibarra',
    ],
    abstract:
      'The Santa Cruz Radio Observatory (ROSAC) is a new observational and monitoring facility in radio astronomy being developed by the Space Research Center (CINESPA) of the University of Costa Rica, located near Santa Cruz in Guanacaste province. The facility features an eleven-meter antenna, repurposed from a former parabolic reflector, operating between 100 MHz and 1 GHz for solar monitoring, with extended capabilities for teaching and research reaching into the Ka band. Built in collaboration with the Instituto Nacional de Astrofísica, Óptica y Electrónica (INAOE) of Mexico, the paper describes the observatory’s construction, assembly procedures, antenna alignment protocols, testing results, the development of solar-tracking instrumentation, and project management across institutional and private-sector partnerships.',
    externalUrl:
      'https://www.spiedigitallibrary.org/conference-proceedings-of-spie/14151/141511L/The-Santa-Cruz-Radio-Observatory-ROSAC--the-first-radio/10.1117/12.3100841.full?tab=ArticleLink',
    doi: '10.1117/12.3100841',
  },
]

await prisma.researchCrossAuthor.deleteMany()
await prisma.research.deleteMany()
await prisma.researchAuthor.deleteMany()
await prisma.publisher.deleteMany()

for (const record of researchRecords) {
  const publisher = await prisma.publisher.create({ data: { name: record.publisher } })

  const research = await prisma.research.create({
    data: {
      title: record.title,
      publicationDate: record.publicationDate,
      publisherId: publisher.id,
      abstract: record.abstract,
      externalUrl: record.externalUrl,
      doi: record.doi,
    },
  })

  for (const [index, name] of record.authors.entries()) {
    const author = await prisma.researchAuthor.create({ data: { name } })

    await prisma.researchCrossAuthor.create({
      data: { researchId: research.id, researchAuthorId: author.id, position: index },
    })
  }
}

/**
 * Initial data for the news tables.
 * This is temporary mock content until the CMS is done.
 */
type SeedNews = {
  title: string
  publishedAt: Date | null
  source: string
  authors: string[]
  abstract: string
  externalUrl: string
  imageUrl: string
}

const newsRecords: SeedNews[] = [
  {
    title:
      '¿Cómo que aquí no pasa nada? Cinco proyectos científicos para entusiasmarse en Costa Rica',
    authors: ['Jorge Arturo Mora'],
    source: 'La Nación – Revista Dominical',
    publishedAt: new Date('2026-05-24'),
    abstract:
      'Reportaje sobre proyectos científicos costarricenses, entre ellos ROSAC, el radiotelescopio de la Universidad de Costa Rica dedicado al estudio de la actividad solar.',
    externalUrl:
      'https://www.nacion.com/revista-dominical/como-que-aqui-no-pasa-nada-cinco-proyectos/CZAKRKAEDJE7DPTMVO52LFBZQQ/story/',
    imageUrl: '/images/news/la-nacion-1.png',
  },
  {
    title: '¿Vale la pena invertir en ciencia? Estos proyectos costarricenses son la respuesta',
    authors: ['Leonardo Garnier'],
    source: 'La Nación – Opinión (Leonardo Garnier)',
    publishedAt: new Date('2026-05-28'),
    abstract:
      'Artículo de opinión que destaca a ROSAC como ejemplo de investigación científica costarricense y de la importancia de la inversión pública en ciencia.',
    externalUrl:
      'https://www.nacion.com/opinion/columnistas/vale-la-pena-invertir-en-ciencia-estos-proyectos/ILX4QIPB6JGHBCJ6QB34QRGY2A/story/',
    imageUrl: '/images/decorative/Solar-Flare.png',
  },
  {
    title:
      'Científicos de la UCR monitorean la actividad solar para estudiar el impacto del clima espacial en el país',
    authors: ['Alonso Martinez'],
    source: 'Delfino.cr',
    publishedAt: new Date('2025-12-05'),
    abstract:
      'Un proyecto de la UCR busca generar datos propios sobre la actividad solar y desarrollar herramientas para estudiar y predecir el impacto del clima espacial en Costa Rica.',
    externalUrl:
      'https://delfino.cr/2025/12/cientificos-de-la-ucr-monitorean-la-actividad-solar-para-estudiar-el-impacto-del-clima-espacial-en-el-pais',
    imageUrl: '/images/news/delfino-1.png',
  },
  {
    title:
      'Científicos de la UCR monitorean la actividad solar para estudiar el impacto del clima espacial en nuestro país',
    authors: ['Tatiana Carmona Rizo'],
    source: 'Universidad de Costa Rica (UCR)',
    publishedAt: new Date('2025-12-05'),
    abstract:
      'La UCR presenta un proyecto interdisciplinario para estudiar la actividad solar y sus efectos sobre Costa Rica mediante observaciones, instrumentación científica y herramientas computacionales.',
    externalUrl:
      'https://www.ucr.ac.cr/noticias/2025/12/05/cientificos-de-la-ucr-monitorean-la-actividad-solar-para-estudiar-el-impacto-del-clima-espacial-en-nuestro-pais.html',
    imageUrl: '/images/news/ucr-1.png',
  },
  {
    title: 'UCR pone en funcionamiento radiotelescopio para investigar el Sol',
    authors: ['Gerardo Quesada A.'],
    source: 'El Norte Hoy',
    publishedAt: new Date('2023-10-02'),
    abstract:
      'ROSAC, el radiotelescopio del Radio Observatorio de Santa Cruz, permitirá monitorear la radiación solar durante las 24 horas y generar datos para investigaciones científicas.',
    externalUrl:
      'https://elnortehoycr.com/2023/10/02/ucr-pone-en-funcionamiento-radiotelescopio-para-investigar-el-sol/',
    imageUrl: '/images/news/el-norte-hoy-1.png',
  },
  {
    title:
      'Empresa global de telecomunicaciones hace una donación a la UCR para radio observatorio que estudiará el Sol',
    authors: ['Patricia Blanco Picado'],
    source: 'Universidad de Costa Rica (UCR)',
    publishedAt: new Date('2023-09-12'),
    abstract:
      'El Grupo Prysmian Centroamérica y el Caribe donó casi dos kilómetros de cable de fibra óptica y cableado eléctrico para el proyecto del Radio Observatorio Santa Cruz (Rosac), un aporte cercano a los USD 36 000 que permitirá a Costa Rica contar con un telescopio para medir la radiación electromagnética del Sol.',
    externalUrl:
      'https://www.ucr.ac.cr/noticias/2023/9/12/empresa-global-de-telecomunicaciones-hace-una-donacion-a-la-ucr-para-radio-observatorio-que-estudiara-el-sol.html',
    imageUrl: '/images/news/ucr-2.png',
  },
  {
    title:
      'Prysmian dona $36.000 en cables de energía y telecomunicaciones para el desarrollo del único radio telescopio solar de su tipo en Centroamérica',
    authors: ['Prysmian'],
    source: 'Prysmian Pro',
    publishedAt: null,
    abstract:
      'Prysmian donó cerca de tres kilómetros de cables de energía y telecomunicaciones para apoyar el desarrollo y puesta en funcionamiento del radiotelescopio solar ROSAC.',
    externalUrl:
      'https://prysmianpro.com/en/prysmian-group-dona-36-000-en-cables-de-energia-y-telecomunicaciones-para-el-desarrollo-del-unico-radio-telescopio-solar-de-su-tipo-en-centroamerica/',
    imageUrl: '/images/decorative/Solar-Flare.png',
  },
  {
    title: 'El impacto social de Prysmian en la era de la transición energética',
    authors: ['Prysmian'],
    source: 'Prysmian Pro',
    publishedAt: null,
    abstract:
      'Artículo sobre el impacto social y educativo de Prysmian que menciona al proyecto del radiotelescopio solar ROSAC como una iniciativa de educación, inclusión y sostenibilidad.',
    externalUrl: 'https://prysmianpro.com/el-impacto-social-de-prysmian-en-la-era-de-la-transicion-energetica/',
    imageUrl: '/images/decorative/Solar-Flare.png',
  },
  {
    title: 'Radiotelescopio en Guanacaste para estudiar el Sol',
    authors: ['Mercadeo RACSA'],
    source: 'RACSA',
    publishedAt: new Date('2022-05-20'),
    abstract:
      'RACSA presenta el radiotelescopio de ROSAC y su objetivo de estudiar el Sol mediante la medición de ondas de radio, destacando su carácter pionero en Costa Rica y Centroamérica.',
    externalUrl: 'https://www.racsa.go.cr/blog/radiotelescopio-en-guanacaste-para-estudiar-el-sol/',
    imageUrl: '/images/decorative/Solar-Flare.png',
  },
  {
    title: 'Radiotelescopio en Guanacaste apunta hacia el Sol para ayudar a revelar sus secretos',
    authors: ['Francisco Ruiz León'],
    source: 'El Financiero',
    publishedAt: new Date('2022-03-17'),
    abstract:
      'El radiotelescopio de ROSAC busca generar datos locales que permitan estudiar cómo las ondas solares pueden afectar sistemas como radares y telecomunicaciones en Costa Rica.',
    externalUrl:
      'https://www.elfinancierocr.com/tecnologia/radiotelescopio-en-guanacaste-apunta-hacia-el-sol/XP3IRSKZVJDWTGUBZH5R2S6GKE/story/',
    imageUrl: '/images/decorative/Solar-Flare.png',
  },
  {
    title: 'UCR instala radiotelescopio en Guanacaste con antena parabólica donada por Racsa',
    authors: ['Johnny Castro'],
    source: 'La República',
    publishedAt: new Date('2022-02-10'),
    abstract:
      'La UCR inició el montaje de ROSAC en Guanacaste utilizando una antena parabólica donada por RACSA y adaptada para realizar observaciones solares.',
    externalUrl:
      'https://origin.larepublica.net/noticia/ucr-instala-radiotelescopio-en-guanacaste-con-antena-parabolica-donada-por-racsa',
    imageUrl: '/images/news/la-republica-1.png',
  },
  {
    title: 'UCR contará con su propio radiotelescopio para explorar el cosmos',
    authors: ['Manrique Vindas Segura'],
    source: 'Universidad de Costa Rica (UCR)',
    publishedAt: new Date('2017-06-05'),
    abstract:
      'Un proyecto de investigación de la UCR estudia la transformación de una gran antena instalada en la Finca Experimental de Santa Cruz en un radiotelescopio para estudiar los astros.',
    externalUrl:
      'https://vinv.ucr.ac.cr/es/noticias/ucr-contara-con-su-propio-radiotelescopio-para-explorar-el-cosmos',
    imageUrl: '/images/news/ucr-3.png',
  },
]

await prisma.newsCrossAuthor.deleteMany()
await prisma.news.deleteMany()
await prisma.newsAuthor.deleteMany()
await prisma.newsSource.deleteMany()

for (const record of newsRecords) {
  const source = await prisma.newsSource.upsert({
    where: {
      name: record.source,
    },
    update: {},
    create: {
      name: record.source,
    },
  })

  const news = await prisma.news.create({
    data: {
      title: record.title,
      publishedAt: record.publishedAt,
      sourceId: source.id,
      abstract: record.abstract,
      externalUrl: record.externalUrl,
      imageUrl: record.imageUrl,
    },
  })

  for (const [index, name] of record.authors.entries()) {
    const author = await prisma.newsAuthor.upsert({
      where: { name },
      update: {},
      create: { name },
    })

    await prisma.newsCrossAuthor.create({
      data: { newsId: news.id, newsAuthorId: author.id, position: index },
    })
  }
}

await prisma.$disconnect()
