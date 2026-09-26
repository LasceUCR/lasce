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
  researchGroup: 'LASCE' | 'ROSAC'
  authors: string[]
  abstract: string
  externalUrl: string
  doi?: string
}

const researchRecords: SeedResearch[] = [
  {
    title: 'International Capacity Building in Machine Learning applied to Space Weather and GNSS.',
    publicationDate: new Date('2026-08-01'),
    publisher: '46th COSPAR Scientific Assembly',
    researchGroup: 'LASCE',
    authors: [],
    abstract:
      'In recent years, machine learning (ML), space weather (SWx), and Global Navigation Satellite System (GNSS) applications have attracted significant attention from both the scientific and operations communities, establishing themselves as prominent research areas. Consequently, there has been a rapid growth in publications investigating how Artificial Intelligence (AI) techniques can advance space weather research and related areas. However, applying AI to SWx and GNSS poses numerous technical challenges. These include handling large data volumes, ensuring data availability and quality, developing advanced algorithms and software tools, and addressing the complexity of multiple spatial and temporal scales inherent to space weather. Additional challenges include handling imbalanced datasets—particularly the accurate representation of extreme space-weather events—and integrating heterogeneous data sources that often must be combined, such as solar imagery, solar and geomagnetic indices, ground-based measurements, and derived datasets. Moreover, operational applications require particular considerations and specialized techniques. As a result, students and researchers are often confronted not only with complex scientific questions but also with additional technical skill requirements that are typically not addressed in standard academic curricula. To address this gap, a series of workshops has been organized to build capacity and provide hands-on training in these emerging techniques. In this context, we outline the objectives and challenges associated with developing an international school on ML applied to SWx. We draw on experiences and lessons learned from these workshops and discuss prospective next steps.',
    externalUrl: '',
  },
  {
    title:
      'The Santa Cruz Radio Observatory (ROSAC): the first radio astronomy facility in Costa Rica',
    publicationDate: new Date('2026-07-05'),
    publisher: 'Proceedings of SPIE, Vol. 14151',
    researchGroup: 'ROSAC',
    authors: [
      'David Michael Gale',
      'Carolina Salas Matamoros',
      'Miguel Velázquez',
      'Wagner Mejías',
      'Gustavo Lara',
      'Andrés Fallas',
      'Federico Ruíz',
      'Óscar Núñez',
      'Eduardo Ibarra',
    ],
    abstract:
      'The Santa Cruz Radio Observatory (ROSAC) is a new observational and monitoring facility in radio astronomy being developed by the Space Research Center (CINESPA) of the University of Costa Rica. The observatory is based at a regional campus near the small town of Santa Cruz in the province of Guanacaste, a rural state about five hours drive from San José. CINESPA is in the process of commissioning an 11-meter radio antenna for solar monitoring in the frequency range 100MHz to 1GHz, however the antenna will have further capability to operate as a teaching and research instrument for radioastronomy up to Ka band. Antenna construction is being carried out with collaboration from the National Institute for Astrophysics, Optics and Electronics (INAOE) in Mexico. The antenna uses a repurposed 11-meter shaped parabolic primary reflector donated by Costa Rica’s national telecommunications company, and a commercial fully steerable elevation-over-azimuth mount. In this paper we describe our progress towards completion and operation of the antenna, focusing on the challenges of working at a rural location with limited on-site support. We discuss the problems and solutions encountered during on-site construction, antenna transportation, assembly and alignment, and early testing. We also consider the construction of a simple primary-focus instrument for solar monitoring, and the specific challenges of solar tracking with this antenna. We provide a discussion of project management, human and financial resources, and the level of support from the university and private sector, that have enabled the project to move forward since its beginnings.',
    externalUrl:
      'https://spie.org/astronomical-telescopes-instrumentation/presentation/The-Santa-Cruz-Radio-Observatory-ROSAC--the-first-radio/14151-60',
    doi: '10.1117/12.3100841',
  },
  {
    title:
      'Improving Space Weather Forecasting with GESD: A Generative-Evolutionary Synthetic Data Approach',
    publicationDate: new Date('2024-11-27'),
    publisher: '2024 IEEE 42nd Central America and Panama Convention (CONCAPAN XLII)',
    researchGroup: 'LASCE',
    authors: [
      'Felipe Meza Obando',
      'Jeaustin Calderón Quesada',
      'Jorge Ruiz Murillo',
      'Carolina Salas Matamoros',
      'Juan Luis Crespo Mariño',
    ],
    abstract:
      'Accurate predictions with low error rates are crucial in the domain of space weather forecasting, particularly for predicting the transit time of Coronal Mass Ejections (CMEs). This study demonstrates the effectiveness of using a simple, essential dataset comprising only two variables, to achieve high predictive accuracy. An absolute mean error (MAE) of 9.32 was obtained, showcasing the efficiency of the proposed method. The architecture was a generative-evolutionary model, which optimized generative and polynomial parameters through an evolutionary algorithm, ensuring the lowest possible error. This approach highlights the potential of combining essential datasets with common techniques to achieve robust and precise predictions for space weather events.',
    externalUrl: 'https://ieeexplore.ieee.org/abstract/document/10933895',
    doi: '10.1109/CONCAPAN63470.2024.10933895',
  },
  {
    title:
      'Non-thermal electrons in an eruptive solar event: Magnetic structure, confinement, and escape into the heliosphere',
    publicationDate: new Date('2024-07-30'),
    publisher: 'Astronomy & Astrophysics',
    researchGroup: 'LASCE',
    authors: [
      'Karl Ludwig Klein',
      'Carolina Salas Matamoros',
      'Abdallah Hamini',
      'Alexander Kollhoff',
    ],
    abstract:
      'Filament eruptions and coronal mass ejections (CMEs) reveal large-scale instabilities of magnetic structures in the solar corona. Some of them are accompanied by radio emission, which at decimetric and longer wavelengths is a signature of electron acceleration that may be different from the acceleration in impulsive flares. The radio emission is part of the broadband continua at decimetre and metre wavelengths called type IV bursts. Aims. In this article we investigate a particularly well-observed combination of a filament eruption seen in Hα and at extreme ultraviolet (EUV) wavelengths and a moving type IV burst on 2021 August 24. The aim is to shed light on the relationship between the large-scale erupting magnetic structure and the acceleration and transport of non-thermal electrons. Methods. We used imaging observations of a moving radio source and associated burst groups with the refurbished Nançay Radioheliograph and whole-Sun radio spectrography from different ground-based and space-borne instruments, in combination with X-ray, radio, and in situ electron observations at tens of keV from Solar Orbiter and EUV imaging by SDO/AIA. The radio sources are located with respect to the erupting magnetic structure traced by the filament (EUV 30.4 nm), and the timing of the electrons detected in situ is compared with the timing of the different radio emissions. Results. We find that the moving radio source is located at the top of the erupting magnetic structure outlined by the filament, which we interpret as a magnetic flux rope. The flux rope erupts in a strongly non-radial direction, guided by the overlying magnetic field of a coronal hole. The electrons detected at Solar Orbiter are found to be released mainly in two episodes, 10─40 minutes after the impulsive phase. The releases coincide with two groups of radio bursts, which originate respectively on the flank and near the top of the erupting flux rope. Conclusions. The observation allows an unusually clear association between a moving type IV radio burst, an erupting magnetic flux rope as core structure of a CME, and particle releases into the heliosphere. Non-thermal electrons are confined in the flux rope. Electrons escape to the heliosphere mainly in two distinct episodes, which we relate to magnetic reconnection between the flux rope and ambient open field lines.',
    externalUrl: 'https://kerwa.ucr.ac.cr/items/07812085-8a66-4081-8b36-ece3a89e18e2',
    doi: '10.1051/0004-6361/202450456',
  },
]

for (const record of researchRecords) {
  const publisher = await prisma.publisher.upsert({
    where: {
      name: record.publisher,
    },
    update: {},
    create: {
      name: record.publisher,
    },
  })

  const research = await prisma.research.upsert({
    where: record.doi
      ? {
        doi: record.doi,
      }
      : {
        externalUrl: record.externalUrl,
      },
    update: {
      title: record.title,
      publicationDate: record.publicationDate,
      publisherId: publisher.id,
      researchGroup: record.researchGroup,
      abstract: record.abstract,
      doi: record.doi,
    },
    create: {
      title: record.title,
      publicationDate: record.publicationDate,
      publisherId: publisher.id,
      researchGroup: record.researchGroup,
      abstract: record.abstract,
      externalUrl: record.externalUrl,
      doi: record.doi,
    },
  })

  for (const [index, name] of record.authors.entries()) {
    const author = await prisma.researchAuthor.upsert({
      where: { name },
      update: {},
      create: { name },
    })

    await prisma.researchCrossAuthor.upsert({
      where: {
        researchId_researchAuthorId: {
          researchId: research.id,
          researchAuthorId: author.id,
        },
      },
      update: {
        position: index,
      },
      create: {
        researchId: research.id,
        researchAuthorId: author.id,
        position: index,
      },
    })
  }
}

await prisma.$disconnect()

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
  imageAlt: string
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
    imageUrl: '/images/news/placeholder.jpg',
    imageAlt:
      'Proyectos científicos de vanguardia para Costa Rica en el Centro Nacional de Alta Tecnología.',
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
    imageUrl: '/images/news/placeholder.jpg',
    imageAlt: '',
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
    imageUrl: '/images/news/placeholder.jpg',
    imageAlt: 'Equipo multidisciplinario que trabaja en el proyecto del radiotelescopio ROSAC.',
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
    imageUrl: '/images/news/placeholder.jpg',
    imageAlt: 'Radiotelescopio ROSAC.',
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
    imageUrl: '/images/news/placeholder.jpg',
    imageAlt: 'Radiotelescopio ROSAC.',
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
    imageUrl: '/images/news/placeholder.jpg',
    imageAlt: 'Radio telescopio en el Recinto de Santa Cruz.',
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
    imageUrl: '/images/news/placeholder.jpg',
    imageAlt: '',
  },
  {
    title: 'El impacto social de Prysmian en la era de la transición energética',
    authors: ['Prysmian'],
    source: 'Prysmian Pro',
    publishedAt: null,
    abstract:
      'Artículo sobre el impacto social y educativo de Prysmian que menciona al proyecto del radiotelescopio solar ROSAC como una iniciativa de educación, inclusión y sostenibilidad.',
    externalUrl:
      'https://prysmianpro.com/el-impacto-social-de-prysmian-en-la-era-de-la-transicion-energetica/',
    imageUrl: '/images/news/placeholder.jpg',
    imageAlt: '',
  },
  {
    title: 'Radiotelescopio en Guanacaste para estudiar el Sol',
    authors: ['Mercadeo RACSA'],
    source: 'RACSA',
    publishedAt: new Date('2022-05-20'),
    abstract:
      'RACSA presenta el radiotelescopio de ROSAC y su objetivo de estudiar el Sol mediante la medición de ondas de radio, destacando su carácter pionero en Costa Rica y Centroamérica.',
    externalUrl: 'https://www.racsa.go.cr/blog/radiotelescopio-en-guanacaste-para-estudiar-el-sol/',
    imageUrl: '/images/news/placeholder.jpg',
    imageAlt: '',
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
    imageUrl: '/images/news/placeholder.jpg',
    imageAlt: '',
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
    imageUrl: '/images/news/placeholder.jpg',
    imageAlt: 'El Radio Observatorio de Santa Cruz (ROSAC).',
  },
  {
    title: 'UCR contará con su propio radiotelescopio para explorar el cosmos.',
    authors: ['Manrique Vindas Segura'],
    source: 'Universidad de Costa Rica (UCR)',
    publishedAt: new Date('2017-06-05'),
    abstract:
      'Un proyecto de investigación de la UCR estudia la transformación de una gran antena instalada en la Finca Experimental de Santa Cruz en un radiotelescopio para estudiar los astros.',
    externalUrl:
      'https://vinv.ucr.ac.cr/es/noticias/ucr-contara-con-su-propio-radiotelescopio-para-explorar-el-cosmos',
    imageUrl: '/images/news/placeholder.jpg',
    imageAlt:
      'Antena instalada en la Finca Experimental de Santa Cruz (FESC) de la Universidad de Costa Rica.',
  },
]

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

  const news = await prisma.news.upsert({
    where: {
      externalUrl: record.externalUrl,
    },
    update: {
      title: record.title,
      publishedAt: record.publishedAt,
      sourceId: source.id,
      abstract: record.abstract,
      imageUrl: record.imageUrl,
      imageAlt: record.imageAlt,
    },
    create: {
      title: record.title,
      publishedAt: record.publishedAt,
      sourceId: source.id,
      abstract: record.abstract,
      externalUrl: record.externalUrl,
      imageUrl: record.imageUrl,
      imageAlt: record.imageAlt,
    },
  })

  for (const [index, name] of record.authors.entries()) {
    const author = await prisma.newsAuthor.upsert({
      where: { name },
      update: {},
      create: { name },
    })

    await prisma.newsCrossAuthor.upsert({
      where: {
        newsId_newsAuthorId: {
          newsId: news.id,
          newsAuthorId: author.id,
        },
      },
      update: {
        position: index,
      },
      create: {
        newsId: news.id,
        newsAuthorId: author.id,
        position: index,
      },
    })
  }
}

/**
 * Initial data for the Nosotros activity flashcards ("¿Qué hacemos?"). This is
 * editorial content LASCE supplied before the CMS existed, so there is no
 * real admin account to credit as `modifiedBy` (required, not nullable, on
 * `NosotrosActivity`). `seedContentAuthor` stands in for one: `passwordHash`
 * reuses the well-formed, unmatchable hash from
 * `apps/web/app/lib/auth/password.ts` (`UNKNOWN_USER_PASSWORD_HASH`), so this
 * account can never authenticate.
 */
const seedContentAuthor = await prisma.user.upsert({
  where: { email: 'contenido@lasce.cinespa.ucr.ac.cr' },
  update: {},
  create: {
    fullName: 'Contenido institucional LASCE',
    email: 'contenido@lasce.cinespa.ucr.ac.cr',
    institution: 'CINESPA, Universidad de Costa Rica',
    countryCode: 'CR',
    passwordHash:
      'scrypt$32768$8$3$TPkSsPwib6wZJH9ldDofuw==$0qYXeu1PzONJVFvfqX6nsBSwDrkCAdcwZ7Q0az2MZWVcvo4O90Jra1fobA0QsXNpivpSF6ZSss6PFG8gWmVVdg==',
    role: 'ADMIN',
  },
})

type SeedNosotrosActivity = {
  icon: 'SUN' | 'WAVES' | 'SATELLITE' | 'CODE' | 'COLLABORATION' | 'EDUCATION'
  title: string
  paragraph: string
}

const nosotrosActivities: SeedNosotrosActivity[] = [
  {
    icon: 'SUN',
    title: 'Fenómenos solares eruptivos',
    paragraph:
      "Analizamos fenómenos solares eruptivos, como 'flares', eyecciones de masa coronal (CMEs, por sus siglas en inglés) y emisiones solares de radio.",
  },
  {
    icon: 'WAVES',
    title: 'Perturbaciones y relación Sol-Tierra',
    paragraph:
      'Estudiamos la evolución de perturbaciones solares y su relación con el viento solar, el campo magnético interplanetario y local, y la ionosfera.',
  },
  {
    icon: 'SATELLITE',
    title: 'Integración de observaciones',
    paragraph:
      'Integramos mediciones propias con imágenes y datos de satélites, estaciones terrestres y observatorios internacionales.',
  },
  {
    icon: 'CODE',
    title: 'Herramientas computacionales',
    paragraph:
      'Implementamos y desarrollamos herramientas computacionales para procesar datos, reconocer patrones y apoyar a la investigación en la predicción del clima espacial y su impacto en nuestro país.',
  },
  {
    icon: 'COLLABORATION',
    title: 'Colaboración interdisciplinaria',
    paragraph:
      'Promovemos proyectos interdisciplinarios y colaboraciones nacionales e internacionales.',
  },
  {
    icon: 'EDUCATION',
    title: 'Formación de estudiantes',
    paragraph:
      'Creamos oportunidades de formación práctica para estudiantes mediante investigación, instrumentación, programación y análisis de datos.',
  },
]

await prisma.nosotrosActivity.deleteMany()

for (const activity of nosotrosActivities) {
  await prisma.nosotrosActivity.create({
    data: { ...activity, modifiedBy: seedContentAuthor.id },
  })
}

await prisma.$disconnect()
