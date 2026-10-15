/**
 * Initial data for the research table. The scope of the sprint (6-september-2026) was not
 * to create a full CRUD, so this seed is just temporary to populate the research table until the
 * CMS is done. Each publication is seeded in Spanish (its base row) and in English (its
 * translation row), so it reads complete in both languages; running the seed again updates both.
 */
import { fileURLToPath } from 'node:url'

import { config as loadEnv } from 'dotenv'

loadEnv({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true })

const { prisma } = await import('../src/index.js')

type SeedText = { title: string; abstract: string }

type SeedResearch = {
  /** The text in each language: Spanish on the base row, English in its translation row. */
  content: { es: SeedText; en: SeedText }
  publicationDate: Date
  publisher: string
  researchGroup: 'LASCE' | 'ROSAC'
  authors: string[]
  externalUrl: string
  doi?: string
}

const researchRecords: SeedResearch[] = [
  {
    // The official title is the same in both languages; the abstract is translated.
    content: {
      es: {
        title:
          'International Capacity Building in Machine Learning applied to Space Weather and GNSS.',
        abstract:
          'En los últimos años, el aprendizaje automático (ML), el clima espacial (SWx) y las aplicaciones de los Sistemas Globales de Navegación por Satélite (GNSS) han atraído una atención considerable de las comunidades científica y operativa, y se han consolidado como áreas de investigación destacadas. En consecuencia, ha crecido rápidamente el número de publicaciones que investigan cómo las técnicas de inteligencia artificial (IA) pueden impulsar la investigación del clima espacial y de áreas afines. Sin embargo, aplicar la IA al SWx y al GNSS plantea numerosos desafíos técnicos. Entre ellos están el manejo de grandes volúmenes de datos, la disponibilidad y la calidad de los datos, el desarrollo de algoritmos y herramientas de software avanzados, y la complejidad de las múltiples escalas espaciales y temporales propias del clima espacial. Otros desafíos son el manejo de conjuntos de datos desbalanceados —en particular, la representación precisa de los eventos extremos de clima espacial— y la integración de fuentes de datos heterogéneas que a menudo deben combinarse, como imágenes solares, índices solares y geomagnéticos, mediciones en tierra y conjuntos de datos derivados. Además, las aplicaciones operativas requieren consideraciones particulares y técnicas especializadas. Como resultado, estudiantes e investigadores suelen enfrentarse no solo a preguntas científicas complejas, sino también a requisitos técnicos adicionales que por lo general no se abordan en los planes de estudio académicos habituales. Para cerrar esta brecha, se ha organizado una serie de talleres que desarrollan capacidades y ofrecen formación práctica en estas técnicas emergentes. En este contexto, describimos los objetivos y los desafíos de desarrollar una escuela internacional de ML aplicado al SWx, a partir de las experiencias y lecciones aprendidas en estos talleres, y discutimos los próximos pasos.',
      },
      en: {
        title:
          'International Capacity Building in Machine Learning applied to Space Weather and GNSS.',
        abstract:
          'In recent years, machine learning (ML), space weather (SWx), and Global Navigation Satellite System (GNSS) applications have attracted significant attention from both the scientific and operations communities, establishing themselves as prominent research areas. Consequently, there has been a rapid growth in publications investigating how Artificial Intelligence (AI) techniques can advance space weather research and related areas. However, applying AI to SWx and GNSS poses numerous technical challenges. These include handling large data volumes, ensuring data availability and quality, developing advanced algorithms and software tools, and addressing the complexity of multiple spatial and temporal scales inherent to space weather. Additional challenges include handling imbalanced datasets—particularly the accurate representation of extreme space-weather events—and integrating heterogeneous data sources that often must be combined, such as solar imagery, solar and geomagnetic indices, ground-based measurements, and derived datasets. Moreover, operational applications require particular considerations and specialized techniques. As a result, students and researchers are often confronted not only with complex scientific questions but also with additional technical skill requirements that are typically not addressed in standard academic curricula. To address this gap, a series of workshops has been organized to build capacity and provide hands-on training in these emerging techniques. In this context, we outline the objectives and challenges associated with developing an international school on ML applied to SWx. We draw on experiences and lessons learned from these workshops and discuss prospective next steps.',
      },
    },
    publicationDate: new Date('2026-08-01'),
    publisher: '46th COSPAR Scientific Assembly',
    researchGroup: 'LASCE',
    authors: [],
    externalUrl: '',
  },
  {
    // The official title is the same in both languages; the abstract is translated.
    content: {
      es: {
        title:
          'The Santa Cruz Radio Observatory (ROSAC): the first radio astronomy facility in Costa Rica',
        abstract:
          'El Radio Observatorio de Santa Cruz (ROSAC) es una nueva instalación de observación y monitoreo en radioastronomía que desarrolla el Centro de Investigaciones Espaciales (CINESPA) de la Universidad de Costa Rica. El observatorio se ubica en una sede regional cerca del pequeño pueblo de Santa Cruz, en la provincia de Guanacaste, una zona rural a unas cinco horas en carro de San José. El CINESPA está poniendo en funcionamiento una radioantena de 11 metros para el monitoreo solar en el rango de frecuencias de 100 MHz a 1 GHz; además, la antena podrá operar como instrumento de docencia e investigación en radioastronomía hasta la banda Ka. La construcción de la antena se realiza en colaboración con el Instituto Nacional de Astrofísica, Óptica y Electrónica (INAOE) de México. La antena utiliza un reflector primario parabólico conformado de 11 metros, reutilizado y donado por la empresa nacional de telecomunicaciones de Costa Rica, y una montura comercial de elevación sobre azimut totalmente orientable. En este artículo describimos nuestros avances hacia la finalización y la operación de la antena, con énfasis en los desafíos de trabajar en una ubicación rural con apoyo limitado en el sitio. Discutimos los problemas y las soluciones encontrados durante la construcción en el sitio, el transporte de la antena, el ensamblaje y la alineación, y las primeras pruebas. También consideramos la construcción de un instrumento sencillo de foco primario para el monitoreo solar y los desafíos específicos del seguimiento solar con esta antena. Por último, discutimos la gestión del proyecto, los recursos humanos y financieros, y el apoyo de la universidad y del sector privado que han permitido que el proyecto avance desde sus inicios.',
      },
      en: {
        title:
          'The Santa Cruz Radio Observatory (ROSAC): the first radio astronomy facility in Costa Rica',
        abstract:
          'The Santa Cruz Radio Observatory (ROSAC) is a new observational and monitoring facility in radio astronomy being developed by the Space Research Center (CINESPA) of the University of Costa Rica. The observatory is based at a regional campus near the small town of Santa Cruz in the province of Guanacaste, a rural state about five hours drive from San José. CINESPA is in the process of commissioning an 11-meter radio antenna for solar monitoring in the frequency range 100MHz to 1GHz, however the antenna will have further capability to operate as a teaching and research instrument for radioastronomy up to Ka band. Antenna construction is being carried out with collaboration from the National Institute for Astrophysics, Optics and Electronics (INAOE) in Mexico. The antenna uses a repurposed 11-meter shaped parabolic primary reflector donated by Costa Rica’s national telecommunications company, and a commercial fully steerable elevation-over-azimuth mount. In this paper we describe our progress towards completion and operation of the antenna, focusing on the challenges of working at a rural location with limited on-site support. We discuss the problems and solutions encountered during on-site construction, antenna transportation, assembly and alignment, and early testing. We also consider the construction of a simple primary-focus instrument for solar monitoring, and the specific challenges of solar tracking with this antenna. We provide a discussion of project management, human and financial resources, and the level of support from the university and private sector, that have enabled the project to move forward since its beginnings.',
      },
    },
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
    externalUrl:
      'https://spie.org/astronomical-telescopes-instrumentation/presentation/The-Santa-Cruz-Radio-Observatory-ROSAC--the-first-radio/14151-60',
    doi: '10.1117/12.3100841',
  },
  {
    // The official title is the same in both languages; the abstract is translated.
    content: {
      es: {
        title:
          'Improving Space Weather Forecasting with GESD: A Generative-Evolutionary Synthetic Data Approach',
        abstract:
          'Las predicciones precisas y con bajas tasas de error son cruciales en el pronóstico del clima espacial, en particular para predecir el tiempo de tránsito de las eyecciones de masa coronal (CME). Este estudio demuestra la eficacia de usar un conjunto de datos sencillo y esencial, de solo dos variables, para lograr una alta precisión predictiva. Se obtuvo un error absoluto medio (MAE) de 9,32, lo que muestra la eficiencia del método propuesto. La arquitectura fue un modelo generativo-evolutivo, que optimizó los parámetros generativos y polinomiales mediante un algoritmo evolutivo para obtener el menor error posible. Este enfoque resalta el potencial de combinar conjuntos de datos esenciales con técnicas comunes para lograr predicciones robustas y precisas de los eventos de clima espacial.',
      },
      en: {
        title:
          'Improving Space Weather Forecasting with GESD: A Generative-Evolutionary Synthetic Data Approach',
        abstract:
          'Accurate predictions with low error rates are crucial in the domain of space weather forecasting, particularly for predicting the transit time of Coronal Mass Ejections (CMEs). This study demonstrates the effectiveness of using a simple, essential dataset comprising only two variables, to achieve high predictive accuracy. An absolute mean error (MAE) of 9.32 was obtained, showcasing the efficiency of the proposed method. The architecture was a generative-evolutionary model, which optimized generative and polynomial parameters through an evolutionary algorithm, ensuring the lowest possible error. This approach highlights the potential of combining essential datasets with common techniques to achieve robust and precise predictions for space weather events.',
      },
    },
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
    externalUrl: 'https://ieeexplore.ieee.org/abstract/document/10933895',
    doi: '10.1109/CONCAPAN63470.2024.10933895',
  },
  {
    // The official title is the same in both languages; the abstract is translated.
    content: {
      es: {
        title:
          'Non-thermal electrons in an eruptive solar event: Magnetic structure, confinement, and escape into the heliosphere',
        abstract:
          'Las erupciones de filamentos y las eyecciones de masa coronal (CME) revelan inestabilidades a gran escala de las estructuras magnéticas de la corona solar. Algunas van acompañadas de emisión en radio que, en longitudes de onda decimétricas y mayores, es una señal de aceleración de electrones que puede diferir de la aceleración en las fulguraciones impulsivas. Esta emisión forma parte de los continuos de banda ancha en longitudes de onda decimétricas y métricas llamados estallidos de tipo IV. Objetivos. En este artículo investigamos una combinación especialmente bien observada de una erupción de filamento, vista en Hα y en longitudes de onda del ultravioleta extremo (EUV), y un estallido de tipo IV en movimiento el 24 de agosto de 2021. El objetivo es esclarecer la relación entre la estructura magnética eruptiva a gran escala y la aceleración y el transporte de electrones no térmicos. Métodos. Usamos observaciones de imagen de una fuente de radio en movimiento y de los grupos de estallidos asociados con el renovado Radioheliógrafo de Nançay, y espectrografía de radio de todo el disco solar de distintos instrumentos terrestres y espaciales, en combinación con observaciones en rayos X, en radio y de electrones in situ de decenas de keV de Solar Orbiter, e imágenes en EUV de SDO/AIA. Las fuentes de radio se ubican respecto de la estructura magnética eruptiva trazada por el filamento (EUV 30,4 nm), y la temporización de los electrones detectados in situ se compara con la de las distintas emisiones de radio. Resultados. La fuente de radio en movimiento se ubica en la parte superior de la estructura magnética eruptiva delineada por el filamento, que interpretamos como una cuerda de flujo magnético. La cuerda de flujo hace erupción en una dirección marcadamente no radial, guiada por el campo magnético suprayacente de un agujero coronal. Los electrones detectados por Solar Orbiter se liberan principalmente en dos episodios, entre 10 y 40 minutos después de la fase impulsiva. Estas liberaciones coinciden con dos grupos de estallidos de radio, que se originan respectivamente en el flanco y cerca de la parte superior de la cuerda de flujo eruptiva. Conclusiones. La observación permite una asociación inusualmente clara entre un estallido de radio de tipo IV en movimiento, una cuerda de flujo magnético eruptiva como estructura central de una CME y la liberación de partículas hacia la heliosfera. Los electrones no térmicos están confinados en la cuerda de flujo y escapan a la heliosfera principalmente en dos episodios distintos, que relacionamos con la reconexión magnética entre la cuerda de flujo y las líneas de campo abiertas circundantes.',
      },
      en: {
        title:
          'Non-thermal electrons in an eruptive solar event: Magnetic structure, confinement, and escape into the heliosphere',
        abstract:
          'Filament eruptions and coronal mass ejections (CMEs) reveal large-scale instabilities of magnetic structures in the solar corona. Some of them are accompanied by radio emission, which at decimetric and longer wavelengths is a signature of electron acceleration that may be different from the acceleration in impulsive flares. The radio emission is part of the broadband continua at decimetre and metre wavelengths called type IV bursts. Aims. In this article we investigate a particularly well-observed combination of a filament eruption seen in Hα and at extreme ultraviolet (EUV) wavelengths and a moving type IV burst on 2021 August 24. The aim is to shed light on the relationship between the large-scale erupting magnetic structure and the acceleration and transport of non-thermal electrons. Methods. We used imaging observations of a moving radio source and associated burst groups with the refurbished Nançay Radioheliograph and whole-Sun radio spectrography from different ground-based and space-borne instruments, in combination with X-ray, radio, and in situ electron observations at tens of keV from Solar Orbiter and EUV imaging by SDO/AIA. The radio sources are located with respect to the erupting magnetic structure traced by the filament (EUV 30.4 nm), and the timing of the electrons detected in situ is compared with the timing of the different radio emissions. Results. We find that the moving radio source is located at the top of the erupting magnetic structure outlined by the filament, which we interpret as a magnetic flux rope. The flux rope erupts in a strongly non-radial direction, guided by the overlying magnetic field of a coronal hole. The electrons detected at Solar Orbiter are found to be released mainly in two episodes, 10─40 minutes after the impulsive phase. The releases coincide with two groups of radio bursts, which originate respectively on the flank and near the top of the erupting flux rope. Conclusions. The observation allows an unusually clear association between a moving type IV radio burst, an erupting magnetic flux rope as core structure of a CME, and particle releases into the heliosphere. Non-thermal electrons are confined in the flux rope. Electrons escape to the heliosphere mainly in two distinct episodes, which we relate to magnetic reconnection between the flux rope and ambient open field lines.',
      },
    },
    publicationDate: new Date('2024-07-30'),
    publisher: 'Astronomy & Astrophysics',
    researchGroup: 'LASCE',
    authors: [
      'Karl Ludwig Klein',
      'Carolina Salas Matamoros',
      'Abdallah Hamini',
      'Alexander Kollhoff',
    ],
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

  const { es, en } = record.content

  const research = await prisma.research.upsert({
    where: record.doi
      ? {
          doi: record.doi,
        }
      : {
          externalUrl: record.externalUrl,
        },
    update: {
      title: es.title,
      publicationDate: record.publicationDate,
      publisherId: publisher.id,
      researchGroup: record.researchGroup,
      abstract: es.abstract,
      doi: record.doi,
    },
    create: {
      title: es.title,
      publicationDate: record.publicationDate,
      publisherId: publisher.id,
      researchGroup: record.researchGroup,
      abstract: es.abstract,
      externalUrl: record.externalUrl,
      doi: record.doi,
    },
  })

  // The English text, so the record reads complete in both languages instead of legacy.
  await prisma.researchTranslation.upsert({
    where: { researchId_locale: { researchId: research.id, locale: 'en' } },
    update: { title: en.title, abstract: en.abstract },
    create: { researchId: research.id, locale: 'en', title: en.title, abstract: en.abstract },
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

/**
 * Initial data for the research_areas table. This is content LASCE provided,
 * like other seeds here, before the CMS implementation of the respective
 * site
 */

type SeedResearchAreaText = { title: string; description: string }

type SeedResearchArea = {
  /** Spanish, as LASCE provided it, and English. Both are written, so the area is complete. */
  content: { es: SeedResearchAreaText; en: SeedResearchAreaText }
  src: string
}

const researchAreas: SeedResearchArea[] = [
  {
    content: {
      es: {
        title: 'Radioastronomía solar y evolución de Flares-CMEs',
        description:
          'Estudia las emisiones solares de radio y su relación con los flares, la evolución de las eyecciones de masa coronal, la aceleración de partículas y su propagación hacia el medio interplanetario.',
      },
      en: {
        title: 'Solar radio astronomy and the evolution of flares and CMEs',
        description:
          'Studies solar radio emissions and their relation to flares, the evolution of coronal mass ejections, particle acceleration and their propagation into the interplanetary medium.',
      },
    },
    src: '/images/research/radioastronomia-solar-evolucion-flares-cmes.jpg',
  },
  {
    content: {
      es: {
        title: 'Geomagnetismo y respuesta regional al clima espacial',
        description:
          'Analiza las variaciones del campo magnético terrestre producidas por la actividad solar. Incluye el cálculo de índices geomagnéticos para Costa Rica. Este estudio se lleva a cabo gracias al desarrollo de una tesis doctoral de la MSc. Johana Camacho en colaboración con el Instituto Nacional de Electricidad (ICE) y el Servicio de Clima Espacial México (SCiESMEX).',
      },
      en: {
        title: 'Geomagnetism and the regional response to space weather',
        description:
          "Analyzes the variations of the Earth's magnetic field caused by solar activity, including the calculation of geomagnetic indices for Costa Rica. This study is carried out through the doctoral thesis of MSc. Johana Camacho, in collaboration with the Instituto Nacional de Electricidad (ICE) and the Servicio de Clima Espacial México (SCiESMEX).",
      },
    },
    src: '/images/research/geomagnetismo-respuesta-regional-clima-espacial.jpg',
  },
  {
    content: {
      es: {
        title: 'Propagación y predicción de CMEs hacia la Tierra',
        description:
          'Desarrolla modelos y herramientas para estimar la velocidad, la trayectoria y el tiempo de llegada de las CMEs a la Tierra. Esta rama incluye el desarrollo de la herramienta científica computacional SWAAT y su futura integración con observaciones de ROSAC.',
      },
      en: {
        title: 'Propagation and prediction of Earth-directed CMEs',
        description:
          'Develops models and tools to estimate the speed, trajectory and arrival time of CMEs at the Earth. This branch includes the development of the SWAAT computational scientific tool and its future integration with ROSAC observations.',
      },
    },
    src: '/images/research/propagacion-prediccion-cmes-hacia-tierra.png',
  },
  {
    content: {
      es: {
        title: 'Inteligencia artificial y ciencia de datos aplicada al clima espacial',
        description:
          'Emplea aprendizaje automático, automatización y generación de datos sintéticos para identificar eventos solares, procesar grandes volúmenes de observaciones y mejorar la predicción de fenómenos de clima espacial.',
      },
      en: {
        title: 'Artificial intelligence and data science applied to space weather',
        description:
          'Uses machine learning, automation and synthetic data generation to identify solar events, process large volumes of observations and improve the prediction of space weather phenomena.',
      },
    },
    src: '/images/research/inteligencia-artificial-ciencia-datos-clima-espacial.jpg',
  },
  {
    content: {
      es: {
        title: 'Ionosfera GNSS y efectos tecnológicos del clima espacial',
        description:
          'Busca hacer observaciones desde Costa Rica con equipos GNSS para determinar cómo la actividad solar y geomagnética modifica la ionosfera y afecta los sistemas de navegación satelital, las comunicaciones y otras tecnologías sensibles a las condiciones del entorno espacial en nuestro país.',
      },
      en: {
        title: 'GNSS ionosphere and the technological effects of space weather',
        description:
          'Aims to make observations from Costa Rica with GNSS equipment to determine how solar and geomagnetic activity modifies the ionosphere and affects satellite navigation systems, communications and other technologies sensitive to space environment conditions in our country.',
      },
    },
    src: '/images/research/ionosfera-gnss-efectos-tecnologicos-clima-espacial.jpg',
  },
  {
    content: {
      es: {
        title: 'Infraestructura informática y gestión de datos de clima espacial',
        description:
          'Diseña y desarrolla plataformas informáticas para capturar, procesar, almacenar y consultar grandes volúmenes de datos solares provenientes de distintas fuentes. Esta rama también implementa bases de datos y servicios web especializados, y facilita el análisis interdisciplinario de la información en colaboración con investigadores en astrofísica solar y clima espacial.',
      },
      en: {
        title: 'Computing infrastructure and space weather data management',
        description:
          'Designs and develops computing platforms to capture, process, store and query large volumes of solar data from different sources. This branch also implements specialized databases and web services, and supports the interdisciplinary analysis of the information in collaboration with researchers in solar astrophysics and space weather.',
      },
    },
    src: '/images/research/infraestructura-informatica-gestion-datos-clima-espacial.jpg',
  },
  {
    content: {
      es: {
        title: 'Geomagnetismo en Costa Rica',
        description:
          'Estudia las variaciones del campo magnético terrestre ante diferentes condiciones de actividad solar y geomagnética. Esta rama utiliza mediciones magnéticas realizadas en tiempo real en nuestro país para calcular índices geomagnéticos específicos para Costa Rica y desarrollar herramientas de monitoreo adaptadas al entorno regional.',
      },
      en: {
        title: 'Geomagnetism in Costa Rica',
        description:
          "Studies the variations of the Earth's magnetic field under different conditions of solar and geomagnetic activity. This branch uses real-time magnetic measurements made in our country to calculate geomagnetic indices specific to Costa Rica and to develop monitoring tools adapted to the regional environment.",
      },
    },
    src: '/images/research/geomagnetismo-costa-rica.jpg',
  },
]

for (const { content, src } of researchAreas) {
  const { es, en } = content
  const existing = await prisma.researchArea.findFirst({
    where: { title: es.title },
    select: { id: true },
  })

  const area = existing
    ? await prisma.researchArea.update({
        where: { id: existing.id },
        data: { title: es.title, description: es.description, src },
      })
    : await prisma.researchArea.create({
        data: { title: es.title, description: es.description, src },
      })

  // The English text, so the area reads complete in both languages instead of legacy.
  await prisma.researchAreaTranslation.upsert({
    where: { researchAreaId_locale: { researchAreaId: area.id, locale: 'en' } },
    update: { title: en.title, description: en.description },
    create: { researchAreaId: area.id, locale: 'en', title: en.title, description: en.description },
  })
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
  },
  {
    title: 'Radiotelescopio en Guanacaste para estudiar el Sol',
    authors: ['Mercadeo RACSA'],
    source: 'RACSA',
    publishedAt: new Date('2022-05-20'),
    abstract:
      'RACSA presenta el radiotelescopio de ROSAC y su objetivo de estudiar el Sol mediante la medición de ondas de radio, destacando su carácter pionero en Costa Rica y Centroamérica.',
    externalUrl: 'https://www.racsa.go.cr/blog/radiotelescopio-en-guanacaste-para-estudiar-el-sol/',
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
    },
    create: {
      title: record.title,
      publishedAt: record.publishedAt,
      sourceId: source.id,
      abstract: record.abstract,
      externalUrl: record.externalUrl,
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

/**
 * Initial data for the ROSAC researcher profiles ("Investigadores" on
 * /radioastronomia). This is the editorial content LASCE supplied before the
 * CMS existed, same as `nosotrosActivities` above — authored by the same
 * placeholder `seedContentAuthor`.
 */
type SeedResearcher = {
  photoUrl: string
  role: string
  name: string
  email?: string[]
  institution: string
  description: string
}

const researchers: SeedResearcher[] = [
  {
    photoUrl: '/images/ROSAC/team/CarolinaSalas.jpg',
    name: 'Dra. Carolina Salas Matamoros',
    role: 'Investigadora principal',
    email: ['carolina.salas_mata@ucr.ac.cr'],
    institution: 'Centro de Investigaciones Espaciales (CINESPA), UCR',
    description:
      'Responsable de la planificación estratégica de los recursos necesarios para el adecuado montaje e instalación del radiotelescopio, así como líder en la gestión y análisis de los datos obtenidos a través de dicho instrumento.',
  },
  {
    photoUrl: '/images/ROSAC/team/MiguelVelazquez.jpg',
    name: 'Dr. Miguel Velázquez',
    role: 'Investigador',
    email: ['miguel.velazquez@ucr.ac.cr'],
    institution: 'Instituto Nacional de Astrofísica, Óptica y Electrónica, México',
    description: 'Encargado del desarrollo de la instrumentación en ROSAC.',
  },
  {
    photoUrl: '/images/ROSAC/team/DavidGale.jpg',
    name: 'Dr. David Gale',
    role: 'Investigador',
    email: ['david.gale@ucr.ac.cr'],
    institution: 'Instituto Nacional de Astrofísica, Óptica y Electrónica (INAOE), Puebla, México',
    description:
      'Instalación y alineación de los reflectores del telescopio. Sistemas mecánicos, pruebas de movimiento, protección contra descargas eléctricas. Apoyo en general.',
  },
  {
    photoUrl: '/images/ROSAC/team/OscarNunez.jpg',
    name: 'Dr. Óscar Núñez',
    role: 'Investigador',
    email: ['oscar.nunezmata@ucr.ac.cr'],
    institution: 'Escuela de Ingeniería Eléctrica, UCR',
    description: 'Encargado del sistema eléctrico y soporte técnico en los motorreductores.',
  },
  {
    photoUrl: '/images/ROSAC/team/FedericoRuiz.png',
    name: 'Dr. Federico Ruiz',
    role: 'Investigador',
    email: ['federico.ruizugalde@ucr.ac.cr'],
    institution: 'Instituto de Investigaciones en Ingeniería (INII), UCR',
    description:
      'Encargado de la implementación y puesta en operación de los sensores y actuadores, así como del desarrollo del controlador y de los sistemas de software asociados al radiotelescopio ROSAC.',
  },
  {
    photoUrl: '/images/ROSAC/team/GustavoLara.jpg',
    name: 'MSc. Gustavo Lara',
    role: 'Investigador',
    email: ['gustavo.lara@ucr.ac.cr'],
    institution: 'Escuela de Ingeniería Topográfica, UCR',
    description:
      'Encargado del control técnico y geodésico, ejecutando desde la nivelación de la base, la calibración angular, el monitoreo de deformaciones de la parábola y el diseño de la red de control. Provee los datos paramétricos para la configuración y el funcionamiento del software de control y seguimiento del radiotelescopio.',
  },
  {
    photoUrl: '/images/ROSAC/team/AndresFallas.jpg',
    name: 'Ing. Andrés Fallas',
    role: 'Investigador',
    email: ['andres.fallas@ucr.ac.cr'],
    institution: 'Escuela de Ingeniería Topográfica, UCR',
    description:
      'Encargado del control técnico y geodésico, ejecutando desde la nivelación de la base, la calibración angular, el monitoreo de deformaciones de la parábola y el diseño de la red de control. Provee los datos paramétricos para la configuración y el funcionamiento del software de control y seguimiento del radiotelescopio.',
  },
  {
    photoUrl: '/images/ROSAC/team/WagnerMejias.jpg',
    name: 'MSc. Wagner Mejías',
    role: 'Investigador',
    email: ['wagner.mejias@ucr.ac.cr'],
    institution: 'Escuela de Ingeniería Mecánica, UCR',
    description:
      'Instalación mecánica de la estructura, mantenimiento preventivo y correctivo, adaptaciones y mejoras en la estructura en general.',
  },
  {
    photoUrl: '/images/ROSAC/team/EduardoIbarra.jpg',
    name: 'Dr. Eduardo Ibarra',
    role: 'Colaborador externo',
    institution: 'Investigador en ingeniería de microondas en Quantum Motion Technologies, Londres',
    description:
      'Colaborador en el desarrollo y pruebas de la etapa de recepción en el rango de 100 MHz a 1.1 GHz, el análisis de sensibilidad del receptor, el diseño del radiotelescopio y en las labores de instalación eléctrica y control del sistema de guiado de la antena.',
  },
  {
    photoUrl: '/images/ROSAC/team/AndresCorrales.jpg',
    name: 'Ing. Andrés Corrales',
    role: 'Colaborador externo',
    institution: 'Hewlett Packard Enterprise, Costa Rica',
    description:
      'Diseñador, desarrollador y mantenedor del software de control del radiotelescopio y software de usuario final.',
  },
  {
    photoUrl: '/images/ROSAC/team/AndresGamboa.jpg',
    name: 'Ing. Andrés Gamboa',
    role: 'Colaborador externo',
    institution: 'Cirtec Medical Enterprise',
    description:
      'Apoyo en tareas de mantenimiento del radiotelescopio, así como en labores electromecánicas relacionadas con el montaje de instrumentos.',
  },
  {
    photoUrl: '/images/ROSAC/team/JelmutRojas.jpg',
    name: 'Jelmuth Rojas',
    role: 'Colaborador externo',
    institution: 'INDI CR',
    description: 'Apoyo en tareas de nivelación de la estructura.',
  },
  {
    photoUrl: '/images/ROSAC/team/BarnaldBocker-2.jpg',
    name: 'Barnald Bocker',
    role: 'Asistente',
    institution: 'Estudiante de la Escuela de Física, UCR',
    description:
      'Apoyo en el desarrollo y mantenimiento del software de control del ROSAC y protocolos de comunicación.',
  },
  {
    photoUrl: '/images/ROSAC/team/FabianChaverri.jpg',
    name: 'MSc. Fabián Chaverri',
    role: 'Futuro estudiante de doctorado',
    institution: 'Centro de Investigaciones Espaciales (CINESPA), UCR',
    description:
      'Futuro estudiante de doctorado con tesis en instrumentación astronómica ligada al proyecto.',
  },
]

await prisma.researcher.deleteMany()

for (const researcher of researchers) {
  await prisma.researcher.create({
    data: { ...researcher, modifiedBy: seedContentAuthor.id },
  })
}

/**
 * Initial data for the Nosotros researcher roster ("Investigadores LASCE" on
 * /nosotros) — independent from `researchers` above (the ROSAC team on
 * /radioastronomia).
 */
type SeedNosotrosResearcher = {
  photoUrl: string
  role: string
  name: string
  email?: string[]
  institution: string
  description?: string
}

const nosotrosResearchers: SeedNosotrosResearcher[] = [
  {
    photoUrl: '/images/ROSAC/team/CarolinaSalas.jpg',
    name: 'Dra. Carolina Salas Matamoros',
    role: 'Investigadora principal',
    email: ['carolina.salas_mata@ucr.ac.cr'],
    institution: 'Centro de Investigaciones Espaciales, CINESPA',
    description:
      'Además de desempeñarse como investigadora principal, orienta la definición de las líneas de investigación, coordina la integración entre astrofísica solar, radioastronomía, clima espacial, análisis de datos e inteligencia artificial; y vincula el trabajo científico con el desarrollo de infraestructura y capacidades de observación propias, particularmente mediante el radiotelescopio ROSAC. Su experiencia en el estudio conjunto de flares, emisiones de rayos X, eyecciones de masa coronal y predicción de tiempos de llegada de ICMEs a la Tierra, proporciona la base científica para impulsar herramientas de monitoreo y pronóstico adaptadas a Costa Rica. Asimismo, promueve la colaboración interdisciplinaria e internacional, la formación de estudiantes y jóvenes investigadores, y la transferencia del conocimiento científico hacia aplicaciones que permitan comprender y anticipar los efectos de la actividad solar sobre el entorno terrestre y los sistemas tecnológicos.',
  },
  {
    photoUrl: '/images/Researchers/AllanBerrocal.jpg',
    name: 'Dr. Allan Francisco Berrocal Rojas',
    role: 'Investigador colaborador',
    email: ['allan.berrocal@ucr.ac.cr'],
    institution: 'Escuela de Ciencias de la Computación e Informática, UCR',
    description:
      'Diseño, desarrollo e implementación de la plataforma informática del LASCE. Las tareas puntuales abarcan la captura de datos masivos de diferentes fuentes con información sobre el clima solar, el almacenamiento de los datos procesados y de interés para el proyecto en sistemas de bases de datos adecuadas para el dominio, y finalmente la habilitación de una interfaz de consulta mediante servicios web. Adicionalmente apoyar en los objetivos de análisis de datos sobre el clima solar junto a investigadores(as) especialistas en la materia como astrofísicos(as) solares.',
  },
  {
    photoUrl: '/images/Researchers/LuisEsquivel.jpeg',
    name: 'Dr. Luis Gustavo Esquivel Quirós',
    role: 'Investigador colaborador',
    email: ['luis.esquivel@ucr.ac.cr'],
    institution: 'Escuela de Ciencias de la Computación e Informática, UCR',
  },
  {
    photoUrl: '/images/Researchers/IvanniaCalvo.png',
    name: 'MSc. Ivannia Calvo',
    role: 'Investigadora colaboradora',
    email: ['ivannia.calvo@ucr.ac.cr'],
    institution: 'Centro de Investigaciones Espaciales',
    description:
      'Soporte Técnico/Computacional y encargada del Observatorio Astronómico de San José (OAS)',
  },
  {
    photoUrl: '/images/Researchers/FelipeMeza.jpg',
    name: 'Dr. Felipe Meza Obando',
    role: 'Investigador colaborador',
    email: ['felipe.mezaobando@ucr.ac.cr'],
    institution:
      'Escuela de Ingeniería Mecatrónica, TEC; Laboratorio de Inteligencia Artificial para las Ciencias Naturales (LIANA), TEC; Centro de Investigaciones Espaciales, UCR',
    description:
      'Desarrollo de modelos inteligentes para el análisis, interpretación y predicción de señales asociadas a fenómenos de clima espacial, integrando inteligencia artificial, procesamiento de señales y radioastronomía solar.',
  },
  {
    photoUrl: '/images/Researchers/User.png',
    name: 'MSc. Alonso Vega',
    role: 'Investigador colaborador',
    email: ['alonso.vega_f@ucr.ac.cr'],
    institution: 'Escuela de Ingeniería Topográfica, UCR',
    description:
      'Procesamiento y análisis de datos GNSS provenientes de estaciones de operación continua colocalizadas el radiotelescopio ROSAC, así como de estaciones de la red SIRGAS-CON, con el propósito de caracterizar las variaciones del contenido electrónico de la ionosfera y su posible relación con la actividad solar.',
  },
  {
    photoUrl: '/images/Researchers/MolinaMariaGraciela.jpg',
    name: 'Dra. Graciela Molina',
    role: 'Investigadora colaboradora',
    email: ['gmolina@herrera.unt.edu.ar'],
    institution:
      'Facultad de Ciencias Exactas y Tecnología (FACET, UNT), Argentina; Istituto Nazionale di Geofisica e Vulcanologia (INGV), Italia',
    description:
      'Su contribución se centra en el análisis y modelado de grandes volúmenes de datos mediante aprendizaje automático, series temporales y computación de alto desempeño, con especial énfasis en el monitoreo y la predicción del estado de la ionosfera ante diferentes condiciones solares y geomagnéticas. Asimismo, aporta su experiencia en instrumentación ionosférica y en el desarrollo de software para la detección automática de señales de radares geofísicos, fortaleciendo la integración entre observaciones, procesamiento avanzado de datos y herramientas predictivas dentro del laboratorio.',
  },
  {
    photoUrl: '/images/Researchers/YencaMigoya.jpg',
    name: 'Dra. Yenca Migoya',
    role: 'Investigadora colaboradora',
    email: ['yenca@ictp.it'],
    institution:
      'Science, Technology and Innovation Unit, The Abdus Salam International Centre for Theoretical Physics (ICTP), Italia',
    description:
      'Su contribución comprende el desarrollo e implementación de modelos físicos y computacionales, incluyendo técnicas de aprendizaje automático para analizar, interpretar, predecir y clasificar fenómenos espaciales. Asimismo, participa en el procesamiento y estudio de datos observacionales y simulaciones, fortaleciendo la capacidad del laboratorio para transformar grandes volúmenes de información en conocimiento científico. Su experiencia contribuye además a la consolidación del LASCE como un espacio de investigación interdisciplinaria y cooperación científica con proyección latinoamericana.',
  },
  {
    photoUrl: '/images/Researchers/JohanaCamacho.jpeg',
    name: 'MSc. Johanna Pamela Camacho Garbanzo',
    role: 'Investigadora colaboradora',
    email: ['jcamachoga@ice.go.cr', 'Johanna.camacho@ucr.ac.cr'],
    institution: 'Instituto Costarricense de Electricidad; Universidad de Costa Rica',
    description:
      'Es geofísica de exploración del Instituto Costarricense de Electricidad (ICE), donde cuenta con más de 17 años de experiencia en la aplicación de métodos geofísicos para la caracterización del subsuelo y el desarrollo de proyectos de investigación aplicada. Asimismo, posee 8 años de experiencia como docente universitaria en la Escuela de Física de la Universidad de Costa Rica, impartiendo laboratorios de Física General. Actualmente es estudiante de doctorado e investigadora del Laboratorio de Clima Espacial (LASCE), donde desarrolla investigaciones relacionadas con geomagnetismo, ionósfera y clima espacial, utilizando registros de campo magnético terrestre en tiempo real. Su trabajo se enfoca en el análisis de la interacción entre la actividad geomagnética y la ionósfera, así como en sus aplicaciones para el estudio del clima espacial en Costa Rica. A lo largo de su trayectoria profesional ha participado en numerosos estudios e informes de investigación geofísica aplicados a infraestructura, exploración del subsuelo, energía e ingeniería, mediante el uso de técnicas como radar de penetración terrestre (GPR), tomografía de resistividad eléctrica y otros métodos geofísicos. Sus principales áreas de interés incluyen la geofísica aplicada, el geomagnetismo, el clima espacial y la formación de nuevas generaciones de científicos e Ingenieros.',
  },
]

await prisma.nosotrosResearcher.deleteMany()

for (const researcher of nosotrosResearchers) {
  await prisma.nosotrosResearcher.create({
    data: { ...researcher, modifiedBy: seedContentAuthor.id },
  })
}

await prisma.$disconnect()
