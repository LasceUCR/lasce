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
          'Analiza las variaciones del campo magnético terrestre producidas por la actividad solar. Incluye el cálculo de índices geomagnéticos para Costa Rica. Este estudio se lleva a cabo gracias al desarrollo de una tesis doctoral de la MSc. Johana Camacho en colaboración con el Instituto Costarricense de Electricidad (ICE) y el Servicio de Clima Espacial México (SCiESMEX).',
      },
      en: {
        title: 'Geomagnetism and the regional response to space weather',
        description:
          "Analyzes the variations of the Earth's magnetic field caused by solar activity, including the calculation of geomagnetic indices for Costa Rica. This study is carried out through the doctoral thesis of MSc. Johana Camacho, in collaboration with the Instituto Costarricense de Electricidad (ICE) and the Servicio de Clima Espacial México (SCiESMEX).",
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
  /** The title and abstract in each language: Spanish on the base row, English as a translation. */
  content: Record<'es' | 'en', { title: string; abstract: string }>
  publishedAt: Date | null
  source: string
  authors: string[]
  externalUrl: string
}

const newsRecords: SeedNews[] = [
  {
    content: {
      es: {
        title:
          '¿Cómo que aquí no pasa nada? Cinco proyectos científicos para entusiasmarse en Costa Rica',
        abstract:
          'Reportaje exhaustivo de la Revista Dominical de La Nación que confronta el escepticismo sobre la investigación científica en el país, documentando cinco iniciativas tecnológicas y biomédicas de vanguardia desarrolladas por universidades públicas. En el campo de las ciencias espaciales, destaca el radiotelescopio solar del Radio Observatorio de Santa Cruz (ROSAC), impulsado por la Universidad de Costa Rica en Guanacaste para monitorear eyecciones de masa coronal y proteger telecomunicaciones. El reportaje profundiza además en proyectos paralelos como el desarrollo de biomateriales para implantes óseos en el Tecnológico de Costa Rica, investigaciones avanzadas en nanotecnología en el CeNAT y avances en biotecnología médica, demostrando cómo la articulación interinstitucional y el talento científico nacional generan conocimiento de impacto global pese a limitaciones presupuestarias.',
      },
      en: {
        title:
          '“Nothing happens here?” Five scientific projects to get excited about in Costa Rica',
        abstract:
          'An in-depth report in La Nación’s Revista Dominical that confronts scepticism about scientific research in the country, documenting five cutting-edge technological and biomedical initiatives developed by public universities. In the space sciences, it highlights the solar radio telescope of the Santa Cruz Radio Observatory (ROSAC), driven by the University of Costa Rica in Guanacaste to monitor coronal mass ejections and protect telecommunications. The report also delves into parallel projects such as the development of biomaterials for bone implants at the Costa Rica Institute of Technology, advanced nanotechnology research at CeNAT and progress in medical biotechnology, showing how inter-institutional coordination and national scientific talent produce knowledge with global impact despite budget constraints.',
      },
    },
    authors: ['Jorge Arturo Mora'],
    source: 'La Nación – Revista Dominical',
    publishedAt: new Date('2026-05-24'),
    externalUrl:
      'https://www.nacion.com/revista-dominical/como-que-aqui-no-pasa-nada-cinco-proyectos/CZAKRKAEDJE7DPTMVO52LFBZQQ/story/',
  },
  {
    content: {
      es: {
        title: '¿Vale la pena invertir en ciencia? Estos proyectos costarricenses son la respuesta',
        abstract:
          'Columna de opinión del exministro Leonardo Garnier en La Nación que articula una sólida defensa de la inversión pública en ciencia, tecnología y educación superior estatal mediante el FEES. Garnier analiza cómo proyectos de alto calibre científico generan valor social y soberanía tecnológica que el mercado privado no financia por sí solo. Detalla con énfasis el radiotelescopio solar ROSAC de la Universidad de Costa Rica, concebido para predecir perturbaciones geomagnéticas provocadas por tormentas solares que amenazan redes eléctricas, satélites de posicionamiento global y telecomunicaciones. Asimismo, vincula este esfuerzo con el Ciclotrón PET/CT para diagnóstico oncológico, los implantes biocompatibles del TEC y los laboratorios del CeNAT, concluyendo que la investigación científica nacional no es un gasto prescindible, sino un pilar estratégico indispensable para la resiliencia y competitividad del país.',
      },
      en: {
        title: 'Is investing in science worth it? These Costa Rican projects are the answer',
        abstract:
          'An opinion column in La Nación by former minister Leonardo Garnier that makes a strong case for public investment in science, technology and state higher education through the FEES. Garnier analyses how high-calibre scientific projects create social value and technological sovereignty that the private market does not fund on its own. He dwells on the University of Costa Rica’s ROSAC solar radio telescope, designed to predict geomagnetic disturbances caused by solar storms that threaten power grids, global positioning satellites and telecommunications. He also links this effort to the PET/CT cyclotron for cancer diagnosis, the biocompatible implants of the TEC and the CeNAT laboratories, concluding that national scientific research is not an expendable cost but an indispensable strategic pillar of the country’s resilience and competitiveness.',
      },
    },
    authors: ['Leonardo Garnier'],
    source: 'La Nación – Opinión (Leonardo Garnier)',
    publishedAt: new Date('2026-05-28'),
    externalUrl:
      'https://www.nacion.com/opinion/columnistas/vale-la-pena-invertir-en-ciencia-estos-proyectos/ILX4QIPB6JGHBCJ6QB34QRGY2A/story/',
  },
  {
    content: {
      es: {
        title:
          'Científicos de la UCR monitorean la actividad solar para estudiar el impacto del clima espacial en el país',
        abstract:
          'Artículo periodístico de Delfino.cr sobre el proyecto multidisciplinario que reúne a investigadores del Centro de Investigaciones Espaciales (Cinespa), la Escuela de Ciencias de la Computación e Informática (ECCI) y el Centro de Investigaciones en Tecnologías de la Información y Comunicación (CITIC) de la Universidad de Costa Rica. La iniciativa aborda el clima espacial desde una perspectiva integral: mientras el radiotelescopio ROSAC en Santa Cruz captura señales electromagnéticas solares en tiempo real, el equipo computacional diseña modelos de aprendizaje automático y procesamiento de series temporales para prever perturbaciones ionosféricas en latitudes tropicales. El artículo resalta que Centroamérica presenta particularidades geomagnéticas poco estudiadas y que contar con datos propios fortalece los sistemas de alerta temprana ante tormentas solares severas.',
      },
      en: {
        title:
          'UCR scientists monitor solar activity to study the impact of space weather on the country',
        abstract:
          'A Delfino.cr article on the multidisciplinary project that brings together researchers from the Space Research Centre (Cinespa), the School of Computer Science and Informatics (ECCI) and the Research Centre for Information and Communication Technologies (CITIC) of the University of Costa Rica. The initiative approaches space weather from an integrated perspective: while the ROSAC radio telescope in Santa Cruz captures solar electromagnetic signals in real time, the computing team designs machine learning and time series models to forecast ionospheric disturbances at tropical latitudes. The article stresses that Central America has little-studied geomagnetic characteristics and that having its own data strengthens early warning systems for severe solar storms.',
      },
    },
    authors: ['Alonso Martinez'],
    source: 'Delfino.cr',
    publishedAt: new Date('2025-12-05'),
    externalUrl:
      'https://delfino.cr/2025/12/cientificos-de-la-ucr-monitorean-la-actividad-solar-para-estudiar-el-impacto-del-clima-espacial-en-el-pais',
  },
  {
    content: {
      es: {
        title:
          'Científicos de la UCR monitorean la actividad solar para estudiar el impacto del clima espacial en nuestro país',
        abstract:
          'Nota oficial de la Universidad de Costa Rica que describe la colaboración interdisciplinaria entre el Centro de Investigaciones Espaciales (Cinespa), la Escuela de Ciencias de la Computación e Informática y el CITIC para analizar y mitigar los efectos del clima espacial en Costa Rica. El reporte detalla la implementación de algoritmos de inteligencia artificial aplicados al procesamiento masivo de datos captados por el Radio Observatorio de Santa Cruz (ROSAC), permitiendo pronosticar la llegada de ondas de choque y eyecciones de masa coronal. Los científicos explican cómo las variaciones inducidas por la actividad solar en la ionosfera afectan directamente la precisión de los sistemas GNSS, las redes de distribución eléctrica y las comunicaciones aeronáuticas en la región, posicionando a la academia costarricense a la vanguardia de la meteorología espacial en Centroamérica.',
      },
      en: {
        title:
          'UCR scientists monitor solar activity to study the impact of space weather on our country',
        abstract:
          'An official University of Costa Rica news release describing the interdisciplinary collaboration between the Space Research Centre (Cinespa), the School of Computer Science and Informatics and CITIC to analyse and mitigate the effects of space weather in Costa Rica. The report details the use of artificial intelligence algorithms to process the large volumes of data captured by the Santa Cruz Radio Observatory (ROSAC), making it possible to forecast the arrival of shock waves and coronal mass ejections. The scientists explain how variations in the ionosphere induced by solar activity directly affect the accuracy of GNSS systems, power distribution networks and aeronautical communications in the region, placing Costa Rican academia at the forefront of space meteorology in Central America.',
      },
    },
    authors: ['Tatiana Carmona Rizo'],
    source: 'Universidad de Costa Rica (UCR)',
    publishedAt: new Date('2025-12-05'),
    externalUrl:
      'https://www.ucr.ac.cr/noticias/2025/12/05/cientificos-de-la-ucr-monitorean-la-actividad-solar-para-estudiar-el-impacto-del-clima-espacial-en-nuestro-pais.html',
  },
  {
    content: {
      es: {
        title: 'UCR pone en funcionamiento radiotelescopio para investigar el Sol',
        abstract:
          'Crónica periodística de El Norte Hoy sobre la puesta en marcha oficial del Radio Observatorio de Santa Cruz (ROSAC), ubicado en la Finca Experimental de la Universidad de Costa Rica en Santa Cruz, Guanacaste. La publicación resalta que se trata del primer radiotelescopio solar de Centroamérica, dotado de un reflector parabólico de 11 metros capaz de realizar barridos continuos en frecuencias de MHz y GHz para detectar estallidos solares de tipo II y IV. Se detalla el respaldo de la Vicerrectoría de Investigación de la UCR y la cooperación técnica con el INAOE de México, así como el tendido especializado de fibra óptica y energía suministrado por Prysmian Group. El artículo subraya que las observaciones alimentarán plataformas científicas abiertas y brindarán oportunidades inéditas de formación para estudiantes de física, ingeniería eléctrica y computación.',
      },
      en: {
        title: 'UCR brings a radio telescope online to study the Sun',
        abstract:
          'An El Norte Hoy report on the official launch of the Santa Cruz Radio Observatory (ROSAC), located at the University of Costa Rica’s Experimental Farm in Santa Cruz, Guanacaste. The piece highlights that it is the first solar radio telescope in Central America, equipped with an 11-metre parabolic reflector able to sweep continuously across MHz and GHz frequencies to detect type II and IV solar bursts. It details the backing of the UCR Office of the Vice President for Research and the technical cooperation with Mexico’s INAOE, as well as the specialised fibre-optic and power cabling supplied by Prysmian Group. The article stresses that the observations will feed open scientific platforms and give physics, electrical engineering and computing students unprecedented training opportunities.',
      },
    },
    authors: ['Gerardo Quesada A.'],
    source: 'El Norte Hoy',
    publishedAt: new Date('2023-10-02'),
    externalUrl:
      'https://elnortehoycr.com/2023/10/02/ucr-pone-en-funcionamiento-radiotelescopio-para-investigar-el-sol/',
  },
  {
    content: {
      es: {
        title:
          'Empresa global de telecomunicaciones hace una donación a la UCR para radio observatorio que estudiará el Sol',
        abstract:
          'Comunicado de la Oficina de Divulgación e Información de la Universidad de Costa Rica que formaliza la donación realizada por el Grupo Prysmian Centroamérica y el Caribe al proyecto del Radio Observatorio Santa Cruz (ROSAC). La donación, valorada en aproximadamente USD 36 000, incluye cerca de dos kilómetros de cable de fibra óptica de última generación y conductores de energía diseñados para soportar las exigentes condiciones climáticas de Guanacaste. La nota resalta las declaraciones de las autoridades universitarias y representantes corporativos sobre la trascendencia de las alianzas público-privadas en el financiamiento de infraestructura de investigación crítica. Esta conexión garantiza la transmisión de datos a gran ancho de banda entre los receptores del radiotelescopio y los servidores de procesamiento en San José.',
      },
      en: {
        title:
          'Global telecommunications company donates to UCR for a radio observatory that will study the Sun',
        abstract:
          'A statement from the University of Costa Rica’s Office of Outreach and Information formalising the donation made by Grupo Prysmian Centroamérica y el Caribe to the Santa Cruz Radio Observatory (ROSAC) project. The donation, valued at approximately USD 36,000, includes about two kilometres of state-of-the-art fibre-optic cable and power conductors designed to withstand Guanacaste’s demanding weather conditions. The release highlights the remarks of university authorities and company representatives on the importance of public-private partnerships in funding critical research infrastructure. This connection guarantees high-bandwidth data transmission between the radio telescope’s receivers and the processing servers in San José.',
      },
    },
    authors: ['Patricia Blanco Picado'],
    source: 'Universidad de Costa Rica (UCR)',
    publishedAt: new Date('2023-09-12'),
    externalUrl:
      'https://www.ucr.ac.cr/noticias/2023/9/12/empresa-global-de-telecomunicaciones-hace-una-donacion-a-la-ucr-para-radio-observatorio-que-estudiara-el-sol.html',
  },
  {
    content: {
      es: {
        title:
          'Prysmian dona $36.000 en cables de energía y telecomunicaciones para el desarrollo del único radio telescopio solar de su tipo en Centroamérica',
        abstract:
          'Artículo técnico y corporativo publicado en Prysmian Pro que documenta la participación del fabricante internacional de cables en el equipamiento del radiotelescopio solar ROSAC en Guanacaste. La publicación explica que el suministro comprendió casi tres kilómetros de cableado eléctrico blindado y enlaces de fibra óptica monomodo indispensables para alimentar los motores de seguimiento azimutal y transportar datos sin atenuación ni interferencias electromagnéticas. La Dra. Carolina Salas Matamoros, investigadora de la Escuela de Física y del Cinespa, enfatiza que la ubicación geográfica de Costa Rica (longitud GMT-6) llena un vacío temporal estratégico en la red planetaria de radioastronomía solar, permitiendo la vigilancia continua del astro rey en frecuencias de 100 a 1 000 MHz cuando otros observatorios internacionales están en periodo nocturno.',
      },
      en: {
        title:
          'Prysmian donates $36,000 in power and telecommunications cables for the only solar radio telescope of its kind in Central America',
        abstract:
          'A technical and corporate article published in Prysmian Pro documenting the international cable maker’s part in equipping the ROSAC solar radio telescope in Guanacaste. It explains that the supply comprised almost three kilometres of armoured power cabling and single-mode fibre-optic links, essential to power the azimuth tracking motors and carry data without attenuation or electromagnetic interference. Dr. Carolina Salas Matamoros, a researcher at the School of Physics and at Cinespa, stresses that Costa Rica’s geographic location (GMT-6) fills a strategic time gap in the global solar radio astronomy network, allowing continuous monitoring of the Sun at frequencies from 100 to 1,000 MHz while other international observatories are in their night-time period.',
      },
    },
    authors: ['Prysmian'],
    source: 'Prysmian Pro',
    publishedAt: null,
    externalUrl:
      'https://prysmianpro.com/en/prysmian-group-dona-36-000-en-cables-de-energia-y-telecomunicaciones-para-el-desarrollo-del-unico-radio-telescopio-solar-de-su-tipo-en-centroamerica/',
  },
  {
    content: {
      es: {
        title: 'El impacto social de Prysmian en la era de la transición energética',
        abstract:
          'Artículo editorial de Prysmian Pro enfocado en las políticas de responsabilidad social corporativa, transición energética y sostenibilidad de Prysmian en América Latina. La empresa presenta la colaboración con la Universidad de Costa Rica en el observatorio ROSAC como un ejemplo emblemático de cómo el sector industrial de conductores eléctricos y fibra óptica puede impulsar proyectos de alto impacto académico y comunitario. Se detalla cómo la infraestructura donada no solo hace posible el monitoreo de fenómenos heliofísicos extremos, sino que también promueve la divulgación científica en comunidades rurales de Guanacaste, inspira a jóvenes estudiantes hacia carreras STEM y consolida capacidades locales para la gestión de redes de telecomunicaciones avanzadas.',
      },
      en: {
        title: "Prysmian's social impact in the era of the energy transition",
        abstract:
          'An editorial article in Prysmian Pro focused on Prysmian’s corporate social responsibility, energy transition and sustainability policies in Latin America. The company presents its collaboration with the University of Costa Rica on the ROSAC observatory as an emblematic example of how the power cable and fibre-optic industry can drive projects with a strong academic and community impact. It describes how the donated infrastructure not only makes it possible to monitor extreme heliophysical phenomena, but also promotes science outreach in rural communities of Guanacaste, inspires young students towards STEM careers and builds local capacity to manage advanced telecommunications networks.',
      },
    },
    authors: ['Prysmian'],
    source: 'Prysmian Pro',
    publishedAt: null,
    externalUrl:
      'https://prysmianpro.com/el-impacto-social-de-prysmian-en-la-era-de-la-transicion-energetica/',
  },
  {
    content: {
      es: {
        title: 'Radiotelescopio en Guanacaste para estudiar el Sol',
        abstract:
          'Artículo divulgativo del blog oficial de RACSA (Radiográfica Costarricense) que relata la reconversión tecnológica de una antena parabólica de telecomunicaciones internacionales en desuso en el primer radiotelescopio solar de Costa Rica y Centroamérica. Ubicada estratégicamente en el Radio Observatorio de Santa Cruz, la antena de 11 metros fue modificada por ingenieros y astrofísicos de la UCR para operar en el rango de 100 a 1 000 MHz. La nota destaca cómo este instrumento especializado registra emisiones de radio asociadas a fulguraciones solares y eyecciones de plasma que perturban el entorno electromagnético terrestre, celebrando la exitosa economía circular que transforma chatarra tecnológica en un centro astronómico de referencia regional.',
      },
      en: {
        title: 'A radio telescope in Guanacaste to study the Sun',
        abstract:
          'An outreach article from the official blog of RACSA (Radiográfica Costarricense) recounting the technological conversion of a disused international telecommunications dish antenna into the first solar radio telescope in Costa Rica and Central America. Strategically located at the Santa Cruz Radio Observatory, the 11-metre antenna was modified by UCR engineers and astrophysicists to operate in the 100 to 1,000 MHz range. The piece highlights how this specialised instrument records radio emissions associated with solar flares and plasma ejections that disturb the Earth’s electromagnetic environment, celebrating the successful circular economy that turns technological scrap into a regional reference centre for astronomy.',
      },
    },
    authors: ['Mercadeo RACSA'],
    source: 'RACSA',
    publishedAt: new Date('2022-05-20'),
    externalUrl: 'https://www.racsa.go.cr/blog/radiotelescopio-en-guanacaste-para-estudiar-el-sol/',
  },
  {
    content: {
      es: {
        title:
          'Radiotelescopio en Guanacaste apunta hacia el Sol para ayudar a revelar sus secretos',
        abstract:
          'Reportaje en profundidad de la sección de Tecnología de El Financiero que detalla la operación diurna del radiotelescopio ROSAC en la Finca Experimental de Santa Cruz. El artículo explica las ventajas de la radioastronomía sobre la astronomía óptica tradicional: las ondas de radio atraviesan la atmósfera, las nubes y la neblina tropical de Guanacaste sin ser absorbidas, lo que permite un monitoreo ininterrumpido del disco solar en cualquier época del año. Los investigadores explican cómo los estallidos solares captados permiten calcular la velocidad y trayectoria de las nubes de plasma coronal, brindando información predictiva clave para salvaguardar satélites en órbita baja, redes de navegación aérea y sistemas de transmisión de energía eléctrica.',
      },
      en: {
        title: 'Guanacaste radio telescope points at the Sun to help reveal its secrets',
        abstract:
          'An in-depth report from El Financiero’s Technology section detailing the daytime operation of the ROSAC radio telescope at the Santa Cruz Experimental Farm. The article explains the advantages of radio astronomy over traditional optical astronomy: radio waves pass through the atmosphere, clouds and Guanacaste’s tropical haze without being absorbed, allowing uninterrupted monitoring of the solar disc at any time of year. The researchers explain how the solar bursts it captures make it possible to calculate the speed and trajectory of coronal plasma clouds, providing key predictive information to safeguard low-orbit satellites, air navigation networks and power transmission systems.',
      },
    },
    authors: ['Francisco Ruiz León'],
    source: 'El Financiero',
    publishedAt: new Date('2022-03-17'),
    externalUrl:
      'https://www.elfinancierocr.com/tecnologia/radiotelescopio-en-guanacaste-apunta-hacia-el-sol/XP3IRSKZVJDWTGUBZH5R2S6GKE/story/',
  },
  {
    content: {
      es: {
        title: 'UCR instala radiotelescopio en Guanacaste con antena parabólica donada por Racsa',
        abstract:
          'Reportaje del periódico La República que cubre el hito de la instalación, montaje mecánico y calibración de la antena parabólica en el Radio Observatorio de Santa Cruz (ROSAC), administrado por la Sede de Guanacaste de la Universidad de Costa Rica. La crónica relata el complejo traslado de la estructura donada por Radiográfica Costarricense (RACSA), su restauración estructural y la instalación de receptores criogénicos y sistemas de seguimiento de alta precisión desarrollados con asistencia del INAOE de México. Se hace hincapié en el impacto formativo del observatorio para la descentralización de la educación superior científica hacia las regiones periféricas de Costa Rica, abriendo campos de tesis e investigación en radioastronomía e instrumentación electrónica.',
      },
      en: {
        title:
          'UCR installs a radio telescope in Guanacaste with a satellite dish donated by Racsa',
        abstract:
          'A La República report covering the milestone of the installation, mechanical assembly and calibration of the dish antenna at the Santa Cruz Radio Observatory (ROSAC), run by the University of Costa Rica’s Guanacaste campus. It recounts the complex transfer of the structure donated by Radiográfica Costarricense (RACSA), its structural restoration and the installation of cryogenic receivers and high-precision tracking systems developed with assistance from Mexico’s INAOE. It emphasises the observatory’s educational impact in decentralising scientific higher education towards Costa Rica’s outlying regions, opening thesis and research opportunities in radio astronomy and electronic instrumentation.',
      },
    },
    authors: ['Johnny Castro'],
    source: 'La República',
    publishedAt: new Date('2022-02-10'),
    externalUrl:
      'https://origin.larepublica.net/noticia/ucr-instala-radiotelescopio-en-guanacaste-con-antena-parabolica-donada-por-racsa',
  },
  {
    content: {
      es: {
        title: 'UCR contará con su propio radiotelescopio para explorar el cosmos.',
        abstract:
          'Reportaje pionero del Portal de la Investigación de la Universidad de Costa Rica que anunció formalmente la génesis del proyecto del Radio Observatorio de Santa Cruz liderado por el Cinespa. El documento expone la visión fundacional de convertir una infraestructura de telecomunicaciones satelitales en una estación de astrofísica y clima espacial dotada de instrumentación moderna. Se describen los convenios internacionales con centros astronómicos de México, los análisis de ruido electromagnético realizados en Santa Cruz para asegurar una zona radioeléctrica limpia, y los objetivos a largo plazo de vincular el observatorio con consorcios mundiales de monitoreo heliofísico, consolidando a Costa Rica en el mapa internacional de la exploración del cosmos.',
      },
      en: {
        title: 'UCR will have its own radio telescope to explore the cosmos',
        abstract:
          'A pioneering report from the University of Costa Rica’s Research Portal that formally announced the beginnings of the Santa Cruz Radio Observatory project led by Cinespa. It sets out the founding vision of turning a satellite telecommunications facility into an astrophysics and space weather station with modern instrumentation. It describes the international agreements with astronomical centres in Mexico, the electromagnetic noise surveys carried out in Santa Cruz to secure a radio-quiet zone, and the long-term goals of linking the observatory with global heliophysics monitoring consortia, putting Costa Rica on the international map of space exploration.',
      },
    },
    authors: ['Manrique Vindas Segura'],
    source: 'Universidad de Costa Rica (UCR)',
    publishedAt: new Date('2017-06-05'),
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

  const { es, en } = record.content

  const news = await prisma.news.upsert({
    where: {
      externalUrl: record.externalUrl,
    },
    update: {
      title: es.title,
      publishedAt: record.publishedAt,
      sourceId: source.id,
      abstract: es.abstract,
    },
    create: {
      title: es.title,
      publishedAt: record.publishedAt,
      sourceId: source.id,
      abstract: es.abstract,
      externalUrl: record.externalUrl,
    },
  })

  // The English text, so the item reads complete in both languages instead of legacy.
  await prisma.newsTranslation.upsert({
    where: { newsId_locale: { newsId: news.id, locale: 'en' } },
    update: { title: en.title, abstract: en.abstract },
    create: { newsId: news.id, locale: 'en', title: en.title, abstract: en.abstract },
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
 * Initial data for `AcademicActivity` (`/actividades-academicas` and the `/noticias` teaser).
 * Same placeholder authorship as `nosotrosActivities` above: editorial content LASCE supplied
 * before this table's CMS form existed.
 */
await prisma.academicActivity.deleteMany()

await prisma.academicActivity.create({
  data: {
    title: '2026 Workshop on Machine Learning Applied to Space Weather and GNSS',
    category: 'Taller',
    startDate: new Date('2026-02-16'),
    endDate: new Date('2026-02-20'),
    location: 'San José, Costa Rica',
    description: [
      'En el marco del proyecto LASCE se realizó, del 16 al 20 de febrero de 2026 en San José, Costa Rica, el Taller sobre Aprendizaje Automático Aplicado al Clima Espacial y a los Sistemas Globales de Navegación por Satélite (GNSS). La actividad reunió durante cinco días a estudiantes, jóvenes investigadores y especialistas para fortalecer sus capacidades en el estudio de la relación Sol-Tierra, el análisis de datos científicos y la aplicación de técnicas de inteligencia artificial y aprendizaje automático al clima espacial.',
      'El programa combinó conferencias, sesiones de discusión y prácticas computacionales dedicadas a los procesos ionosféricos, los efectos del clima espacial sobre los sistemas GNSS, la computación científica y el análisis de datos mediante herramientas de aprendizaje automático. Este enfoque permitió integrar la comprensión física de los fenómenos solares y terrestres con métodos modernos de procesamiento, modelado y predicción, promoviendo además el uso de datos abiertos y procedimientos reproducibles.',
      'El taller contó con 52 participantes presenciales procedentes de 17 países; el 37,2 % fueron mujeres y el 70 % provenía de países en desarrollo. Fue organizado con la participación del Centro de Investigaciones Espaciales de la Universidad de Costa Rica, la Oficina de las Naciones Unidas para Asuntos del Espacio Ultraterrestre, el Comité Internacional sobre los GNSS, COSPAR, INGV y SCOSTEP, junto con contribuciones de la Universidad Nacional de Tucumán y el Centro Internacional de Física Teórica Abdus Salam.',
      'Esta actividad fortaleció la proyección internacional del LASCE, amplió las redes de colaboración científica y contribuyó a la formación de capacidades regionales para investigar, monitorear y predecir los efectos del clima espacial sobre la ionosfera y los sistemas tecnológicos. Asimismo, generó un espacio para identificar nuevos desafíos científicos, oportunidades de cooperación y futuras iniciativas que integren la física del clima espacial con herramientas avanzadas de análisis de datos.',
    ].join('\n\n'),
    photoUrl: '/images/galeria/workshop-ml-2026/1.jpg',
    photoAlt:
      'Comité y participantes junto al cartel oficial del taller de Machine Learning y clima espacial',
    modifiedBy: seedContentAuthor.id,
  },
})

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
    photoUrl: '/images/Researchers/AlonsoVega.jpeg',
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

const galleryImageBase = '/images/galeria'

const galleryMediaDefaults = {
  format: 'JPG',
  isVideo: false,
  uploaderName: 'LASCE',
  capturedAt: new Date('2026-02-16'),
}

type SeedGalleryMedia = {
  src: string
  colSpan: 1 | 2 | 3 | 4
  rowSpan: 1 | 2 | 3 | 4
  title: string
  description: string
  alt: string
}

type SeedGalleryAlbum = {
  slug: string
  title: string
  description: string
  yearsLabel?: string
  cover: string
  media: SeedGalleryMedia[]
  subAlbums?: SeedGalleryAlbum[]
}

const galleryAlbums: SeedGalleryAlbum[] = [
  {
    slug: 'rosac',
    title: 'Fotos del ROSAC',
    description:
      'Documentación fotográfica del desarrollo, montaje y adecuación del Radio Observatorio de Santa Cruz (ROSAC).',
    yearsLabel: '2019–2023',
    cover: 'rosac/8.jpg',
    media: [
      {
        src: 'rosac/1.jpg',
        colSpan: 2,
        rowSpan: 2,
        title: 'Trabajos nocturnos en el radiotelescopio',
        description:
          'Vista nocturna de las antenas del observatorio con una plataforma elevadora realizando labores técnicas en la antena principal.',
        alt: 'Antena parabólica de radiotelescopio iluminada de noche junto a un elevador hidráulico y otra antena secundaria.',
      },
      {
        src: 'rosac/2.jpg',
        colSpan: 1,
        rowSpan: 1,
        title: 'Ajuste de paneles en el plato reflector',
        description:
          'Dos técnicos realizando trabajos de ensamblaje y calibración sobre la superficie del plato de la antena.',
        alt: 'Dos personas con sombreros trabajando en el interior del plato reflector cerca del anillo central.',
      },
      {
        src: 'rosac/3.jpg',
        colSpan: 2,
        rowSpan: 2,
        title: 'Inspección de la base de concreto',
        description:
          'Personal técnico sobre la zapata de cimentación y los pernos de anclaje de la antena.',
        alt: 'Tres operarios de pie sobre la base circular de hormigón con pernos de anclaje y antena al fondo bajo cielo azul.',
      },
      {
        src: 'rosac/4.jpg',
        colSpan: 2,
        rowSpan: 2,
        title: 'Descarga y transporte de estructuras',
        description:
          'Camión grúa transportando componentes y vigas metálicas para el ensamblaje en el sitio del observatorio.',
        alt: 'Camión blanco con brazo articulado rojo transportando estructuras metálicas junto a una antena y caseta.',
      },
      {
        src: 'rosac/5.jpg',
        colSpan: 1,
        rowSpan: 1,
        title: 'Maniobra de izaje del pedestal metálico',
        description:
          'Grúa posicionando el pedestal cilíndrico metálico mientras los operarios guían el anclaje.',
        alt: 'Operario sobre el cilindro metálico sostenido por cadenas de grúa durante las maniobras de montaje.',
      },
      {
        src: 'rosac/6.jpg',
        colSpan: 2,
        rowSpan: 1,
        title: 'Montaje de la plataforma superior de azimut',
        description:
          'Izaje de la plataforma y mecanismo motriz superior sobre el pedestal del radiotelescopio con supervisión en tierra.',
        alt: 'Estructura superior de la antena suspendida por grúa sobre el pedestal metálico mientras el equipo supervisa abajo.',
      },
      {
        src: 'rosac/7.jpg',
        colSpan: 1,
        rowSpan: 2,
        title: 'Instalación del armazón estructural posterior',
        description:
          'Técnico en plataforma elevadora ajustando la estructura reticular de soporte del reflector.',
        alt: 'Brazo articulado amarillo elevando a un técnico hacia la estructura de celosía metálica posterior del plato.',
      },
      {
        src: 'rosac/8.jpg',
        colSpan: 2,
        rowSpan: 2,
        title: 'Equipo de trabajo en la torre del radiotelescopio',
        description:
          'Integrantes del equipo técnico y colaboradores, incluida la Dra. Carolina Salas Matamoros, posando en la estructura de la antena.',
        alt: 'Grupo de personas y una mascota posando en las diferentes plataformas y niveles de la estructura del radiotelescopio.',
      },
      {
        src: 'rosac/9.jpg',
        colSpan: 2,
        rowSpan: 2,
        title: 'Colocación de panel reflector con brazo elevador',
        description:
          'Maniobra de elevación de un gajo del reflector parabólico para su acople en la estructura de soporte.',
        alt: 'Plataforma elevadora izando un panel metálico hacia la parábola del radiotelescopio asistida por operarios.',
      },
      {
        src: 'rosac/10.jpg',
        colSpan: 2,
        rowSpan: 2,
        title: 'Inspección del sistema de motores y engranajes',
        description:
          'Revisión técnica de los motores de elevación y contrapesos en el cabezal del mecanismo de orientación.',
        alt: 'Especialista sonriendo junto al motor eléctrico y el contrapeso del mecanismo de movimiento de la antena.',
      },
      {
        src: 'rosac/11.jpg',
        colSpan: 2,
        rowSpan: 2,
        title: 'Fotografía grupal del equipo frente a la torre',
        description:
          'Investigadores, ingenieros y colaboradores, junto a la Dra. Carolina Salas Matamoros, al pie de la torre de la antena.',
        alt: 'Grupo de once personas del equipo posando de pie y en la base frente a la torre del radiotelescopio.',
      },
      {
        src: 'rosac/12.jpg',
        colSpan: 2,
        rowSpan: 1,
        title: 'Tendido de cableado eléctrico y de control',
        description:
          'Personal técnico realizando la canalización y conexionado subterráneo desde la caseta de control hacia la antena.',
        alt: 'Tres operarios manipulando rollos de cables en una arqueta exterior junto a la caseta y la antena al fondo.',
      },
      {
        src: 'rosac/13.jpg',
        colSpan: 1,
        rowSpan: 2,
        title: 'Instalación del panel de protección eléctrica',
        description:
          'Técnico trabajando en la conexión del tablero eléctrico y dispositivos de supresión de sobretensiones.',
        alt: 'Primer plano de un operario conectando cables en un tablero eléctrico exterior con protecciones y disyuntores.',
      },
      {
        src: 'rosac/14.jpg',
        colSpan: 2,
        rowSpan: 1,
        title: 'Mantenimiento y cableado en la plataforma superior',
        description:
          'Técnicos realizando el guiado y tendido de cables a través del conducto central bajo el plato reflector.',
        alt: 'Dos operarios en la pasarela circular superior de la antena introduciendo cables por la abertura central.',
      },
      {
        src: 'rosac/15.jpg',
        colSpan: 2,
        rowSpan: 2,
        title: 'Entrega y recepción de equipo eléctrico',
        description:
          'Representantes del proyecto, incluida la Dra. Carolina Salas Matamoros, posando junto a tableros y equipos eléctricos donados.',
        alt: 'Seis personas posando en interiores junto a tableros de distribución eléctrica y material técnico.',
      },
      {
        src: 'rosac/16.JPG',
        colSpan: 2,
        rowSpan: 2,
        title: 'El ROSAC durante el atardecer',
        description:
          'Perspectiva en contrapicado del ROSAC y su armazón estructural al atardecer, con una antena secundaria visible en segundo plano.',
        alt: 'Vista angular de la antena parabólica y el pedestal del ROSAC bajo el cielo dorado del atardecer.',
      },
    ],
    subAlbums: [
      {
        slug: 'previos-montaje',
        title: 'Trabajos previos al montaje',
        description:
          'Preparación del sitio, cimentación y adecuación logística de los componentes del observatorio.',
        cover: 'rosac/previos-montaje/1.jpg',
        media: [
          {
            src: 'rosac/previos-montaje/1.jpg',
            colSpan: 2,
            rowSpan: 2,
            title: 'Almacenamiento de base y mecanismo azimutal',
            description:
              'Piezas mecánicas principales y base de rotación resguardadas en bodega antes de su traslado a sitio.',
            alt: 'Estructura mecánica de soporte y montaje almacenada en bodega industrial.',
          },
          {
            src: 'rosac/previos-montaje/2.jpg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Columna cilíndrica del pedestal en bodega',
            description:
              'Cuerpo cilíndrico de soporte estructural de la antena protegido y ubicado en el área de almacenamiento.',
            alt: 'Gran cilindro metálico con bridas reforzadas apoyado horizontalmente en una nave industrial.',
          },
          {
            src: 'rosac/previos-montaje/3.jpg',
            colSpan: 2,
            rowSpan: 1,
            title: 'Traslado del pedestal principal con montacargas',
            description:
              'Supervisión del movimiento y traslado del pedestal cilíndrico por parte de la Dra. Carolina Salas Matamoros.',
            alt: 'Montacargas transportando la columna cilíndrica del radiotelescopio en exteriores.',
          },
          {
            src: 'rosac/previos-montaje/4.jpeg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Inspección de cimientos y pernos de anclaje',
            description:
              'Revisión preliminar de la cimentación de concreto y el círculo de pernos de fijación en el terreno.',
            alt: 'Persona con sombrero observando la base de concreto circular con pernos de anclaje.',
          },
          {
            src: 'rosac/previos-montaje/5.jpeg',
            colSpan: 2,
            rowSpan: 1,
            title: 'Detalle de base de cimentación y corona de pernos',
            description:
              'Vista de la placa guía circular y los pernos de fijación embebidos en el pedestal de concreto.',
            alt: 'Base cilíndrica de concreto con anillo metálico y pernos de anclaje con antena al fondo.',
          },
          {
            src: 'rosac/previos-montaje/6.jpeg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Personal técnico inspeccionando la base estructural',
            description:
              'Equipo técnico verificando niveles y alineación de pernos en la base de concreto previo a la instalación.',
            alt: 'Tres trabajadores revisando los pernos de la base de concreto sobre el terreno.',
          },
          {
            src: 'rosac/previos-montaje/7.jpeg',
            colSpan: 2,
            rowSpan: 2,
            title: 'Primer plano de pernos roscados de nivelación',
            description:
              'Aproximación a los pernos de alta resistencia y placas de nivelación en la superficie de la base.',
            alt: 'Detalle en primer plano de pernos de anclaje roscados y arandelas de soporte.',
          },
          {
            src: 'rosac/previos-montaje/8.jpeg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Inspección interna de la columna de soporte',
            description:
              'Técnico examinando el interior y las uniones de la columna cilíndrica en el área de resguardo.',
            alt: 'Operario inspeccionando la parte interior del cilindro metálico en el almacén.',
          },
          {
            src: 'rosac/previos-montaje/9.jpeg',
            colSpan: 2,
            rowSpan: 1,
            title: 'Transporte de equipo topográfico en almacén',
            description:
              'Personal trasladando instrumentos de medición y escaneo cerca de las partes estructurales.',
            alt: 'Persona transportando estuche de estación total o escáner en nave industrial junto al pedestal.',
          },
          {
            src: 'rosac/previos-montaje/10.jpeg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Módulo azimutal asegurado en transporte terrestre',
            description:
              'Conjunto del mecanismo de rotación y base de soporte fijado con fajas en el contenedor del camión.',
            alt: 'Plataforma mecánica de la antena amarrada dentro del furgón de un camión de carga.',
          },
          {
            src: 'rosac/previos-montaje/11.jpeg',
            colSpan: 2,
            rowSpan: 1,
            title: 'Maniobra de carga de la columna estructural',
            description:
              'Operación de transporte con montacargas del tramo cilíndrico de soporte en vías externas.',
            alt: 'Montacargas movilizando el cilindro estructural metálico sobre asfalto.',
          },
          {
            src: 'rosac/previos-montaje/12.jpg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Equipo colaborador en visita técnica a reflectores',
            description:
              'Dra. Carolina Salas Matamoros y colaboradores durante una jornada de inspección en las instalaciones.',
            alt: 'Tres investigadores posando en el área exterior junto a las estructuras de antenas.',
          },
          {
            src: 'rosac/previos-montaje/13.JPG',
            colSpan: 2,
            rowSpan: 2,
            title: 'Llegada de camión grúa con componentes estructurales',
            description:
              'Arribo de transporte pesado con brazo hidráulico cargado de elementos metálicos al sitio de montaje.',
            alt: 'Camión blanco con grúa hidráulica estacionado en el campo junto a la antena.',
          },
          {
            src: 'rosac/previos-montaje/14.JPG',
            colSpan: 2,
            rowSpan: 1,
            title: 'Detalle de ensamble de anillo de rodamiento y piezas',
            description:
              'Anillo metálico circular con pernos pasantes y piezas angulares organizadas en la estructura de soporte.',
            alt: 'Vista cercana de anillo circular de montaje con herrajes y pernos de ajuste.',
          },
        ],
      },
      {
        slug: 'fotogrametria',
        title: 'Trabajos de fotogrametría para calibrar la parábola',
        description:
          'Estudios iniciales, levantamiento métrico y documentación de la geometría del reflector.',
        cover: 'rosac/fotogrametria/1.jpg',
        media: [
          {
            src: 'rosac/fotogrametria/1.jpg',
            colSpan: 2,
            rowSpan: 2,
            title: 'Preparación de equipo e iluminación nocturna en la antena',
            description:
              'Vista nocturna de la estructura de la antena con iluminación de apoyo y plataforma de elevación durante trabajos técnicos.',
            alt: 'Antena parabólica iluminada en la noche con una grúa canastilla al lado.',
          },
          {
            src: 'rosac/fotogrametria/2.jpg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Silueta del radiotelescopio al atardecer',
            description:
              'Estructura del plato orientada hacia el cenit con plataforma de elevación en el área de trabajo durante el atardecer.',
            alt: 'Silueta de la antena parabólica y plataforma elevadora contra el cielo al atardecer.',
          },
          {
            src: 'rosac/fotogrametria/3.jpeg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Trabajos de medición y colocación de dianas en el plato',
            description:
              'Personal técnico realizando labores de medición y ajuste de referencias sobre los paneles del plato reflector.',
            alt: 'Dos técnicos trabajando en el interior del plato reflector de la antena utilizando equipo de medición.',
          },
          {
            src: 'rosac/fotogrametria/4.jpeg',
            colSpan: 2,
            rowSpan: 2,
            title: 'Labores técnicas en el anillo central del reflector',
            description:
              'Personal realizando mediciones e inspección de paneles y puntos de control en la superficie de la antena.',
            alt: 'Técnicos realizando labores de inspección y fijación de puntos de referencia en la antena.',
          },
          {
            src: 'rosac/fotogrametria/5.jpeg',
            colSpan: 2,
            rowSpan: 1,
            title: 'Herramientas y equipo manual de trabajo',
            description:
              'Disposición de herramientas manuales, llaves, dados y nivel utilizados durante las labores de montaje o ajuste.',
            alt: 'Juego de herramientas mecánicas manuales ordenadas sobre el piso.',
          },
        ],
      },
      {
        slug: 'montaje',
        title: 'Montaje de la estructura',
        description:
          'Posicionamiento, elevación y ensamblaje de los componentes estructurales del radiotelescopio.',
        cover: 'rosac/montaje/1.jpeg',
        media: [
          {
            src: 'rosac/montaje/1.jpeg',
            colSpan: 2,
            rowSpan: 2,
            title: 'Equipo en la estructura de la antena',
            description:
              'Integrantes del equipo de trabajo sobre la plataforma y base de la antena durante las labores de montaje.',
            alt: 'Miembros del equipo posando en la estructura metálica y base de la antena bajo cielo despejado.',
          },
          {
            src: 'rosac/montaje/2.jpeg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Transporte de componente estructural',
            description:
              'Traslado en camión de carga de una sección cilíndrica de la base de la antena hacia el sitio de instalación.',
            alt: 'Camión de plataforma transportando una gran pieza metálica cilíndrica asegurada con cadenas por carretera.',
          },
          {
            src: 'rosac/montaje/3.jpeg',
            colSpan: 2,
            rowSpan: 1,
            title: 'Llegada de componentes al sitio',
            description:
              'Parte del equipo reunido junto al camión de transporte que traslada la base metálica al terreno del proyecto.',
            alt: 'Grupo de personas posando frente al camión de carga con la estructura metálica en el terreno del observatorio.',
          },
          {
            src: 'rosac/montaje/4.jpeg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Inspección de mecanismos y motores',
            description:
              'Personal técnico realizando ajustes y revisión en el sistema motriz y plataforma de la antena.',
            alt: 'Dos técnicos inspeccionando motores y mecanismos de transmisión sobre la plataforma metálica de la base.',
          },
          {
            src: 'rosac/montaje/5.jpeg',
            colSpan: 2,
            rowSpan: 1,
            title: 'Preparación de maniobras con grúa',
            description:
              'Alineación y preparación de cables de izaje junto a la base metálica y la edificación del observatorio.',
            alt: 'Operario preparando eslingas y gancho de grúa en el terreno cerca de la estructura metálica.',
          },
          {
            src: 'rosac/montaje/6.jpeg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Trabajos en altura sobre la estructura',
            description:
              'Uso de plataforma elevadora articulada para acceder a la armadura posterior del reflector parabólico.',
            alt: 'Brazo mecánico elevador con personal trabajando en la estructura reticular de la antena de radio.',
          },
          {
            src: 'rosac/montaje/7.jpeg',
            colSpan: 2,
            rowSpan: 2,
            title: 'Aseguramiento de panel reflector',
            description:
              'Preparación en tierra de un panel reflector para su elevación hacia la armadura de la antena.',
            alt: 'Operarios preparando un panel metálico triangular con cadenas de izaje junto a la plataforma elevadora.',
          },
          {
            src: 'rosac/montaje/8.jpeg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Izaje y guía de panel reflector',
            description:
              'Perspectiva en picada del guiado de un segmento del reflector sujeto a la cesta de elevación.',
            alt: 'Vista aérea de un operario en la canasta elevadora dirigiendo el ascenso de un panel metálico triangular.',
          },
          {
            src: 'rosac/montaje/9.jpeg',
            colSpan: 2,
            rowSpan: 1,
            title: 'Colaboradores junto a panel y andamio',
            description:
              'Personal técnico junto al panel del plato y el andamio de soporte en el terreno de montaje.',
            alt: 'Cuatro trabajadores posando de pie cerca de un panel del reflector y la estructura de andamiaje.',
          },
          {
            src: 'rosac/montaje/10.jpeg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Vista superior de plataforma elevadora',
            description:
              'Toma cenital desde la antena mostrando la plataforma móvil y personal técnico en tierra.',
            alt: 'Vista desde lo alto de la plataforma elevadora con dos personas en la cesta sobre el césped.',
          },
          {
            src: 'rosac/montaje/11.jpg',
            colSpan: 2,
            rowSpan: 1,
            title: 'Grúa telescópica y base en el sitio',
            description:
              'Grúa de carga pesada y camión de soporte ubicados junto a la base metálica del telescopio.',
            alt: 'Grúa telescópica amarilla estacionada cerca de la base cilíndrica y un árbol frondoso en el terreno.',
          },
          {
            src: 'rosac/montaje/12.jpg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Elevación de sección del reflector',
            description:
              'Maniobra de izaje de un panel del plato hacia la estructura montada sobre el pedestal cilíndrico.',
            alt: 'Brazo de elevación izando un segmento de panel hacia la estructura parabólica parcialmente ensamblada.',
          },
          {
            src: 'rosac/montaje/13.jpg',
            colSpan: 2,
            rowSpan: 2,
            title: 'Equipo técnico en la estructura',
            description:
              'La Dra. Carolina Salas Matamoros junto a integrantes del equipo en la estructura metálica de la antena con equipo de seguridad.',
            alt: 'Tres personas con arneses de seguridad posan en el interior de la estructura metálica.',
          },
          {
            src: 'rosac/montaje/14.jpg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Instalación de paneles en el plato',
            description:
              'Técnicos fijando secciones del reflector sobre el entramado estructural de la antena.',
            alt: 'Personal sobre andamios y plataforma elevadora ajustando paneles metálicos en el armazón del plato.',
          },
          {
            src: 'rosac/montaje/15.jpg',
            colSpan: 2,
            rowSpan: 1,
            title: 'Recepción nocturna de componentes',
            description:
              'La Dra. Carolina Salas Matamoros junto a colaboradores sobre la base metálica transportada durante la jornada nocturna.',
            alt: 'Grupo de personas sentadas sobre el cilindro metálico en la plataforma del camión durante la noche.',
          },
          {
            src: 'rosac/montaje/16.jpg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Montaje de superficie reflectora',
            description:
              'Colaboradores trabajando en la fijación de las piezas del reflector sobre la estructura de soporte.',
            alt: 'Técnicos asegurando paneles metálicos a la estructura reticular de la antena desde andamios.',
          },
          {
            src: 'rosac/montaje/17.jpg',
            colSpan: 2,
            rowSpan: 1,
            title: 'Colaboradores en la base de la antena',
            description:
              'La Dra. Carolina Salas Matamoros sentada en la barandilla de la torre junto a miembros del equipo de trabajo.',
            alt: 'Tres colaboradores sonríen junto a la barandilla de la torre de la antena.',
          },
          {
            src: 'rosac/montaje/18.jpg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Colocación del pedestal sobre cimiento',
            description:
              'Base cilíndrica de la antena posicionada sobre la zapata circular de concreto en el terreno.',
            alt: 'Pedestal metálico cilíndrico anclado a la base de concreto con operarios trabajando en la plataforma superior.',
          },
          {
            src: 'rosac/montaje/19.jpg',
            colSpan: 2,
            rowSpan: 2,
            title: 'Alineación de segmento de plato',
            description:
              'Maniobra de aproximación de un panel reflector hacia la estructura circular con asistencia de plataforma elevadora.',
            alt: 'Plataforma elevando un panel triangular hacia la armadura metálica donde operarios esperan para fijarlo.',
          },
          {
            src: 'rosac/montaje/20.jpg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Personal de apoyo en el área de montaje',
            description:
              'Colaborador con equipo de protección personal junto al pedestal cilíndrico de la antena.',
            alt: 'Joven con arnés de seguridad de pie junto a la base metálica cilíndrica y la grúa de soporte.',
          },
          {
            src: 'rosac/montaje/21.jpg',
            colSpan: 2,
            rowSpan: 1,
            title: 'Equipo de trabajo junto a la base',
            description:
              'La Dra. Carolina Salas Matamoros y colaboradores compartiendo en la base de concreto de la antena.',
            alt: 'Cuatro personas posan sonriendo sentadas y de pie en el cimiento de concreto de la antena.',
          },
          {
            src: 'rosac/montaje/22.jpg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Fijación inferior de panel',
            description:
              'Detalle de las labores de empernado y fijación del panel a la estructura soporte del plato.',
            alt: 'Operarios sobre andamio asegurando la parte inferior de un panel metálico a las vigas de soporte.',
          },
          {
            src: 'rosac/montaje/23.jpg',
            colSpan: 2,
            rowSpan: 1,
            title: 'Labores bajo la estructura del plato',
            description:
              'La Dra. Carolina Salas Matamoros y un colega sobre andamios bajo el armazón del reflector parabólico.',
            alt: 'Dos personas sobre el andamiaje metálico directamente debajo de la estructura radial del plato.',
          },
          {
            src: 'rosac/montaje/24.jpeg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Instalación del pedestal con grúa',
            description:
              'Montaje del cuerpo cilíndrico del pedestal sobre la zapata de concreto al atardecer mediante grúa.',
            alt: 'Grúa telescópica sosteniendo la base metálica cilíndrica mientras operarios guían su apoyo en el cimiento.',
          },
          {
            src: 'rosac/montaje/25.jpeg',
            colSpan: 2,
            rowSpan: 2,
            title: 'Revisión técnica de la plataforma motriz',
            description:
              'Detalle de los mecanismos mecánicos y motores de orientación sobre la plataforma antes del ensamblaje.',
            alt: 'Técnicos realizando inspección en el módulo de motores y rodamientos sobre la plataforma de la base.',
          },
          {
            src: 'rosac/montaje/26.jpeg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Izaje de plataforma motriz',
            description:
              'Maniobra de grúa levantando la plataforma de mecanismos para colocarla sobre el pedestal cilíndrico.',
            alt: 'Plataforma circular con barandilla suspendida por cables de grúa directamente sobre la torre cilíndrica.',
          },
          {
            src: 'rosac/montaje/27.jpeg',
            colSpan: 2,
            rowSpan: 1,
            title: 'Acoplamiento de plataforma al pedestal',
            description:
              'Guía manual y descenso de la plataforma de giro sobre la parte superior del pedestal de la antena.',
            alt: 'Operarios sobre una escalera ajustando la unión entre la plataforma suspendida y el cilindro base.',
          },
          {
            src: 'rosac/montaje/28.jpeg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Estructura radial de la antena',
            description:
              'Perspectiva vertical hacia el eje central y las vigas radiales del plato con personal en la torre.',
            alt: 'Vista en contrapicada del centro de la antena y sus vigas radiales con técnicos trabajando en lo alto.',
          },
        ],
      },
      {
        slug: 'instalacion-electrica',
        title: 'Instalación eléctrica de los motores y de control',
        description:
          'Conexión de sistemas eléctricos, cableado de potencia y acondicionamiento de gabinetes de control.',
        cover: 'rosac/instalacion-electrica/1.jpeg',
        media: [
          {
            src: 'rosac/instalacion-electrica/1.jpeg',
            colSpan: 2,
            rowSpan: 2,
            title: 'Técnico trabajando en la estructura del pedestal',
            description:
              'Un técnico equipado con casco y arnés de seguridad realiza labores de cableado e instalación en la parte superior del pedestal.',
            alt: 'Técnico con arnés y casco azul sujetando cables sobre la estructura metálica del pedestal de la antena.',
          },
          {
            src: 'rosac/instalacion-electrica/2.jpeg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Trabajos en el sistema motriz de la antena',
            description:
              'Técnicos revisando el ensamble del motor y la transmisión mecánica en la plataforma superior del radiotelescopio.',
            alt: 'Dos técnicos inspeccionando y ajustando componentes mecánicos y de accionamiento en la plataforma de la antena.',
          },
          {
            src: 'rosac/instalacion-electrica/3.jpeg',
            colSpan: 2,
            rowSpan: 1,
            title: 'Organización de herramientas al pie de la estructura',
            description:
              'Preparación de instrumental, cajas de herramientas y equipo de nivelación para los trabajos de montaje eléctrico y mecánico.',
            alt: 'Miembro del equipo junto a cajas de herramientas y equipo técnico al pie de la torre de la antena.',
          },
          {
            src: 'rosac/instalacion-electrica/4.jpeg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Inspección de canalizaciones en el pedestal',
            description:
              'Técnico verificando el tendido y las conexiones de canalización eléctrica sobre la estructura soporte de la antena.',
            alt: 'Técnico inclinado sobre la estructura metálica inspeccionando elementos de conexión y canalización.',
          },
          {
            src: 'rosac/instalacion-electrica/5.jpeg',
            colSpan: 2,
            rowSpan: 1,
            title: 'Fijación y perforación de soportes en plataforma',
            description:
              'Uso de herramienta eléctrica para fijar soportes y herrajes metálicos sobre la plataforma del radiotelescopio.',
            alt: 'Técnico utilizando un taladro en una placa metálica sobre la plataforma elevada de la antena.',
          },
          {
            src: 'rosac/instalacion-electrica/6.jpeg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Alineación de tubería conduit en la base',
            description:
              'Revisión del guiado de tubería conduit rígida para el paso seguro de cableado de fuerza y control.',
            alt: 'Técnico ajustando tubería de canalización eléctrica que desciende por la estructura de la torre.',
          },
          {
            src: 'rosac/instalacion-electrica/7.jpeg',
            colSpan: 2,
            rowSpan: 2,
            title: 'Canalización eléctrica en la base de la torre',
            description:
              'Técnicos coordinando la instalación de ductos y registros en la parte inferior de la estructura soporte.',
            alt: 'Técnicos trabajando al pie del pedestal en el montaje de ductos y tuberías de alimentación eléctrica.',
          },
          {
            src: 'rosac/instalacion-electrica/8.jpeg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Montaje de canalizaciones en altura media',
            description:
              'Personal técnico utilizando escaleras para acoplar tuberías conduit a las abrazaderas de la torre.',
            alt: 'Dos técnicos asegurando canalizaciones eléctricas en la estructura metálica con apoyo de una escalera.',
          },
          {
            src: 'rosac/instalacion-electrica/9.JPG',
            colSpan: 1,
            rowSpan: 1,
            title: 'Supervisión técnica con la Dra. Carolina Salas Matamoros',
            description:
              'La Dra. Carolina Salas Matamoros supervisando junto a un miembro del equipo los avances en los mecanismos del pedestal.',
            alt: 'Dra. Carolina Salas Matamoros y un técnico examinando los mecanismos de rotación y soporte de la antena.',
          },
          {
            src: 'rosac/instalacion-electrica/10.jpeg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Acceso a la parte superior del pedestal',
            description:
              'Técnico ascendiendo por escalera para realizar ajustes en la tornillería y cajas de conexiones superiores.',
            alt: 'Técnico sobre escalera trabajando en la articulación mecánica del pedestal de la antena.',
          },
          {
            src: 'rosac/instalacion-electrica/11.JPG',
            colSpan: 2,
            rowSpan: 1,
            title: 'Dra. Carolina Salas Matamoros y equipo en la plataforma',
            description:
              'La Dra. Carolina Salas Matamoros y colaboradores en la plataforma de trabajo durante una pausa en la instalación.',
            alt: 'Dra. Carolina Salas Matamoros sonriendo junto a colaboradores sobre la plataforma de la estructura.',
          },
          {
            src: 'rosac/instalacion-electrica/12.jpeg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Revisión conjunta en la plataforma de la antena',
            description:
              'La Dra. Carolina Salas Matamoros y el equipo técnico revisando detalles del ensamblaje en lo alto del pedestal.',
            alt: 'Dra. Carolina Salas Matamoros y personal técnico dialogando sobre la plataforma de servicio de la antena.',
          },
          {
            src: 'rosac/instalacion-electrica/13.jpeg',
            colSpan: 2,
            rowSpan: 2,
            title: 'Ajuste de ensamblajes en la torre soporte',
            description:
              'Miembros del equipo coordinando el ajuste manual de pernos y fijaciones estructurales en la plataforma.',
            alt: 'Integrantes del equipo técnico trabajando en las uniones mecánicas de la plataforma del radiotelescopio.',
          },
          {
            src: 'rosac/instalacion-electrica/14.JPG',
            colSpan: 1,
            rowSpan: 1,
            title: 'Dra. Carolina Salas Matamoros y colaboradores frente al plato',
            description:
              'La Dra. Carolina Salas Matamoros y miembros del equipo en la plataforma con el reflector parabólico de fondo.',
            alt: 'Dra. Carolina Salas Matamoros posando en la plataforma superior junto a tres colaboradores frente al plato.',
          },
          {
            src: 'rosac/instalacion-electrica/15.jpeg',
            colSpan: 2,
            rowSpan: 1,
            title: 'Coordinación técnica sobre el pedestal',
            description:
              'La Dra. Carolina Salas Matamoros y parte del grupo técnico organizando las siguientes etapas de montaje en la estructura.',
            alt: 'Dra. Carolina Salas Matamoros y miembros del equipo técnico reunidos en la plataforma de la antena.',
          },
          {
            src: 'rosac/instalacion-electrica/16.jpeg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Verificación de sensores e interruptores de fin de carrera',
            description:
              'Inspección técnica de los mecanismos de final de carrera y cableado de detección en el eje de la antena.',
            alt: 'Técnicos verificando topes mecánicos y sensores eléctricos de recorrido en la montura de la antena.',
          },
          {
            src: 'rosac/instalacion-electrica/17.jpeg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Ajuste de cables de alimentación en el motorreductor',
            description:
              'Conexión y fijación de acometida y terminales en la unidad de motorización del pedestal.',
            alt: 'Técnicos manipulando cables y terminales junto al motor eléctrico de accionamiento.',
          },
          {
            src: 'rosac/instalacion-electrica/18.jpeg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Revisión de caja de conexiones y terminales',
            description:
              'Técnico examinando el conexionado interno dentro de una caja de derivación en la estructura.',
            alt: 'Técnico revisando cables y borneras dentro de una caja de derivación metálica montada en la estructura.',
          },
          {
            src: 'rosac/instalacion-electrica/19.jpeg',
            colSpan: 2,
            rowSpan: 2,
            title: 'Aseguramiento de conductos en el soporte estructural',
            description:
              'Fijación final de abrazaderas y guías de cableado a lo largo del soporte metálico principal.',
            alt: 'Técnico apretando abrazaderas para sujetar las tuberías de cableado a la viga de soporte.',
          },
          {
            src: 'rosac/instalacion-electrica/20.jpeg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Preparación de módulo de radiofrecuencia en mesa de trabajo',
            description:
              'Miembro del equipo mostrando una placa de circuito electrónico de RF con conectores SMA y cableado en el taller.',
            alt: 'Miembro del equipo sonriendo en el área de trabajo sosteniendo un circuito impreso de radiofrecuencia con conectores.',
          },
          {
            src: 'rosac/instalacion-electrica/21.jpg',
            colSpan: 2,
            rowSpan: 2,
            title: 'Fotografía grupal en exteriores con la Dra. Carolina Salas Matamoros',
            description:
              'El equipo del proyecto junto a la Dra. Carolina Salas Matamoros reunidos frente a las instalaciones con el radiotelescopio de fondo.',
            alt: 'Grupo de trabajo y la Dra. Carolina Salas Matamoros sentados frente al edificio de control con la antena detrás.',
          },
          {
            src: 'rosac/instalacion-electrica/22.jpg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Reunión nocturna del equipo con la Dra. Carolina Salas Matamoros',
            description:
              'La Dra. Carolina Salas Matamoros y miembros del equipo compartiendo en la terraza tras concluir la jornada de trabajo.',
            alt: 'La Dra. Carolina Salas Matamoros, colaboradores y una mascota comparten en el patio durante la noche.',
          },
          {
            src: 'rosac/instalacion-electrica/23.jpg',
            colSpan: 2,
            rowSpan: 1,
            title: 'Lubricación y sellado de brida del motor',
            description:
              'Técnicos aplicando lubricante y sellador en el acople y rodamiento del motorreductor sobre la plataforma.',
            alt: 'Dos técnicos aplicando compuesto de sellado y grasa a la brida de unión de un motor en la antena.',
          },
          {
            src: 'rosac/instalacion-electrica/24.jpg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Fotografía del equipo en áreas verdes con la Dra. Carolina Salas Matamoros',
            description:
              'La Dra. Carolina Salas Matamoros y colaboradores sentados en el césped con la gran antena parabólica en segundo plano.',
            alt: 'Dra. Carolina Salas Matamoros y cinco integrantes del equipo sentados en el jardín frente al radiotelescopio.',
          },
          {
            src: 'rosac/instalacion-electrica/25.jpg',
            colSpan: 2,
            rowSpan: 2,
            title: 'Mantenimiento y ensamblaje de motor eléctrico en laboratorio',
            description:
              'Técnicos equipados con guantes protectores instalando la cubierta y el ventilador en un motorreductor industrial.',
            alt: 'Dos técnicos armando la carcasa y la tapa de ventilación de un motor eléctrico sobre una mesa de trabajo.',
          },
          {
            src: 'rosac/instalacion-electrica/26.jpg',
            colSpan: 1,
            rowSpan: 1,
            title:
              'Equipo de trabajo junto a la Dra. Carolina Salas Matamoros en la base de la torre',
            description:
              'Fotografía grupal de la Dra. Carolina Salas Matamoros y el equipo alrededor del pedestal de concreto y las canalizaciones.',
            alt: 'Dra. Carolina Salas Matamoros y colaboradores posando de pie alrededor de la base cilíndrica de concreto del radiotelescopio.',
          },
          {
            src: 'rosac/instalacion-electrica/27.jpg',
            colSpan: 2,
            rowSpan: 1,
            title: 'Inspección de engranajes y transmisión de elevación',
            description:
              'Técnicos señalando y evaluando el acople mecánico y la holgura en el mecanismo de accionamiento de elevación.',
            alt: 'Técnicos en la plataforma señalando el eje y el sistema de engranajes del mecanismo de elevación.',
          },
          {
            src: 'rosac/instalacion-electrica/28.jpg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Supervisión de engranajes reductores con la Dra. Carolina Salas Matamoros',
            description:
              'Vista detallada de los engranajes helicoidales lubricados con grasa, observados por la Dra. Carolina Salas Matamoros.',
            alt: 'Engranajes internos de la caja reductora cubiertos de grasa observados por la Dra. Carolina Salas Matamoros al fondo.',
          },
          {
            src: 'rosac/instalacion-electrica/29.jpeg',
            colSpan: 2,
            rowSpan: 1,
            title: 'Descanso del equipo en la sala de operaciones',
            description:
              'Miembros del equipo descansando dentro del recinto de control tras una jornada intensiva de trabajo.',
            alt: 'Cinco colaboradores sentados en sofás y sillas dentro de la sala de control al atardecer.',
          },
          {
            src: 'rosac/instalacion-electrica/30.jpeg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Dra. Carolina Salas Matamoros y colaboradores en la barandilla de la torre',
            description:
              'La Dra. Carolina Salas Matamoros y cinco integrantes del equipo sentados a lo largo de la barandilla de la plataforma circular.',
            alt: 'Dra. Carolina Salas Matamoros y colaboradores sentados sobre la barandilla de seguridad de la torre de la antena.',
          },
          {
            src: 'rosac/instalacion-electrica/31.jpeg',
            colSpan: 2,
            rowSpan: 2,
            title: 'Ajuste de soporte y sensor en la estructura de la antena',
            description:
              'Técnico calibrando un soporte metálico para sensor en una de las secciones estructurales del telescopio.',
            alt: 'Técnico ajustando un soporte mecánico con sensor en una barra metálica de la estructura de la antena.',
          },
          {
            src: 'rosac/instalacion-electrica/32.jpeg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Ajuste mecánico del motorreductor con llave de carraca',
            description:
              'Técnicos asegurando la pernería del motorreductor sobre su base en la plataforma de la antena.',
            alt: 'Técnicos utilizando llave de carraca para ajustar los pernos de fijación de un motor eléctrico sobre el pedestal.',
          },
          {
            src: 'rosac/instalacion-electrica/33.jpeg',
            colSpan: 2,
            rowSpan: 1,
            title: 'Bobinado de cobre y rotor de motor eléctrico abierto',
            description:
              'Detalle en primer plano del estator con devanados de cobre, rodamiento y eje del rotor durante tareas de mantenimiento.',
            alt: 'Primer plano del bobinado de cobre, eje y rodamiento de un motor eléctrico industrial destapado.',
          },
          {
            src: 'rosac/instalacion-electrica/34.jpeg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Dra. Carolina Salas Matamoros en la zona de motores del pedestal',
            description:
              'Fotografía de la Dra. Carolina Salas Matamoros junto a los motores de accionamiento y herramientas de mantenimiento en la plataforma.',
            alt: 'Dra. Carolina Salas Matamoros en plano cercano con los motores y herramientas de mantenimiento en la plataforma del pedestal.',
          },
          {
            src: 'rosac/instalacion-electrica/35.jpeg',
            colSpan: 2,
            rowSpan: 1,
            title: 'Cableado de tablero eléctrico de distribución exterior',
            description:
              'Técnico electricista organizando y conectando conductores de potencia de distintos colores en el panel de distribución.',
            alt: 'Técnico trabajando en la conexión de cables eléctricos de colores en un tablero de distribución a la intemperie.',
          },
          {
            src: 'rosac/instalacion-electrica/36.jpeg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Tendido de conductores desde caja de registro subterránea',
            description:
              'Técnicos guiando y jalando cables eléctricos desde una arqueta subterránea hacia el tablero exterior.',
            alt: 'Miembros del equipo manipulando rollos de cables eléctricos entre una zanja abierta y el tablero de distribución.',
          },
          {
            src: 'rosac/instalacion-electrica/37.jpeg',
            colSpan: 2,
            rowSpan: 2,
            title: 'Técnico dentro de pozo de registro subterráneo',
            description:
              'Operario ubicado dentro del pozo de registro eléctrico supervisando la entrada de ductos hacia la antena.',
            alt: 'Técnico de pie dentro de una arqueta subterránea abierta inspeccionando la llegada de tuberías conduit.',
          },
          {
            src: 'rosac/instalacion-electrica/38.jpeg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Punto de acometida eléctrica y cajas de cable',
            description:
              'Vista cenital del registro subterráneo, cajas de conductor eléctrico EcoPlus y el tablero de interruptores abierto.',
            alt: 'Cajas de cable conductor y manguera junto a la arqueta subterránea y el tablero eléctrico abierto.',
          },
          {
            src: 'rosac/instalacion-electrica/39.jpeg',
            colSpan: 2,
            rowSpan: 1,
            title: 'Trabajos en pasarela bajo el plato parabólico',
            description:
              'Perspectiva ascendente de técnicos realizando maniobras en la escalera y pasarela de servicio bajo la parábola.',
            alt: 'Vista en contrapicado de dos técnicos trabajando sobre la pasarela metálica bajo la estructura del plato parabólico.',
          },
          {
            src: 'rosac/instalacion-electrica/40.jpeg',
            colSpan: 1,
            rowSpan: 1,
            title: 'Soldadura de precisión de conector DB-9 en laboratorio',
            description:
              'Operación de estañado y soldadura de conductores en pines de un conector serie con estación de soldar Aoyue.',
            alt: 'Vista superior de manos utilizando cautín para soldar cables en los pines de un conector tipo DB-9 sobre mesa de trabajo.',
          },
          {
            src: 'rosac/instalacion-electrica/41.jpeg',
            colSpan: 2,
            rowSpan: 1,
            title: 'Motorreductor industrial para posicionamiento',
            description:
              'Motorreductor eléctrico industrial con brida y carcasa gris preparado para su instalación.',
            alt: 'Motorreductor eléctrico gris sobre base de cartón en el suelo del laboratorio.',
          },
          {
            src: 'rosac/instalacion-electrica/42.jpeg',
            colSpan: 2,
            rowSpan: 2,
            title: 'Revisión interna de devanados y rodamiento del motor',
            description:
              'Desensamble del motorreductor para verificar el estado de los devanados del estator y el rodamiento del eje.',
            alt: 'Técnicos con guantes amarillos trabajando sobre el motor abierto mostrando el bobinado y rodamiento del eje.',
          },
          {
            src: 'rosac/instalacion-electrica/43.jpeg',
            colSpan: 2,
            rowSpan: 2,
            title: 'Inspección de tren de engranajes y lubricación',
            description:
              'Técnico examinando los engranajes helicoidales con grasa lubricante de la etapa reductora del motor.',
            alt: 'Técnico con gafas observando de cerca los engranajes helicoidales engrasados de la reductora de velocidad.',
          },
        ],
      },
      {
        slug: 'donaciones',
        title: 'Donación EATON para ROSAC',
        description:
          'Equipamiento y tableros eléctricos recibidos para la infraestructura energética del radiotelescopio.',
        cover: 'rosac/donaciones/3.jpeg',
        media: [
          {
            src: 'rosac/donaciones/1.jpeg',
            colSpan: 2,
            rowSpan: 2,
            title: 'Fotografía grupal oficial de entrega de donación',
            description:
              'Equipo de trabajo ampliado y la Dra. Carolina Salas Matamoros reunidos con el equipamiento eléctrico donado.',
            alt: 'Seis participantes posando en grupo junto a los gabinetes y tableros eléctricos.',
          },
          {
            src: 'rosac/donaciones/2.jpeg',
            colSpan: 2,
            rowSpan: 1,
            title: 'Muestra de equipo de distribución y medición eléctrica',
            description:
              'La Dra. Carolina Salas Matamoros y colaboradores exhibiendo el equipo eléctrico y panel de control donados.',
            alt: 'Toma vertical de cuatro personas sonriendo junto al equipo de control eléctrico donado.',
          },
          {
            src: 'rosac/donaciones/3.jpeg',
            colSpan: 2,
            rowSpan: 1,
            title: 'Comprobación de componentes de tablero eléctrico donado',
            description:
              'Encuadre amplio de la entrega de equipos de conmutación y medición de energía eléctrica.',
            alt: 'Cuatro personas junto a módulos de paneles eléctricos industriales en un pasillo.',
          },
        ],
      },
    ],
  },
  {
    slug: 'workshop-ml-2026',
    title: '2026 Workshop on Machine Learning Applied to Space Weather and GNSS',
    description:
      'Taller enfocado en el estudio de la relación Sol-Tierra, el análisis de datos científicos y la aplicación de técnicas de inteligencia artificial y aprendizaje automático al clima espacial y los sistemas GNSS.',
    yearsLabel: 'febrero 2026',
    cover: 'workshop-ml-2026/1.jpg',
    media: [
      {
        src: 'workshop-ml-2026/1.jpg',
        colSpan: 2,
        rowSpan: 2,
        title: 'Comité y participantes junto al cartel oficial',
        description:
          'Miembros de la organización y participantes, incluida la Dra. Carolina Salas Matamoros, posando junto al banner del evento.',
        alt: 'Grupo de personas posando de pie frente al banner del taller de Machine Learning y clima espacial.',
      },
      {
        src: 'workshop-ml-2026/2.jpg',
        colSpan: 1,
        rowSpan: 2,
        title: 'Intervención de la Dra. Carolina Salas Matamoros',
        description:
          'La Dra. Carolina Salas Matamoros dirigiéndose al público desde el podio durante una de las sesiones del taller.',
        alt: 'Dra. Carolina Salas Matamoros hablando ante el micrófono en el podio de la Universidad de Costa Rica.',
      },
      {
        src: 'workshop-ml-2026/3.jpg',
        colSpan: 1,
        rowSpan: 1,
        title: 'Palabras de la Dra. Carolina Salas Matamoros',
        description:
          'Momento de la intervención de la Dra. Carolina Salas Matamoros durante las actividades del evento académico.',
        alt: 'Primer plano de la Dra. Carolina Salas Matamoros sonriendo mientras se dirige a la audiencia desde el podio.',
      },
      {
        src: 'workshop-ml-2026/4.jpg',
        colSpan: 2,
        rowSpan: 1,
        title: 'Conferencia sobre fenómenos solares',
        description:
          'Sesión académica en el auditorio con proyección de láminas explicativas sobre física solar y fulguraciones.',
        alt: 'Expositor en el escenario del auditorio proyectando una lámina informativa sobre erupciones solares.',
      },
      {
        src: 'workshop-ml-2026/5.jpg',
        colSpan: 1,
        rowSpan: 1,
        title: 'Sesión práctica de análisis y programación',
        description:
          'Participantes trabajando con sus computadoras portátiles durante una sesión práctica interactiva.',
        alt: 'Asistentes en el auditorio con computadoras portátiles abiertas siguiendo una sesión práctica proyectada en pantalla.',
      },
      {
        src: 'workshop-ml-2026/6.jpg',
        colSpan: 2,
        rowSpan: 2,
        title: 'Fotografía grupal en el auditorio',
        description:
          'Participantes, ponentes y organizadores reunidos en el escenario principal del auditorio.',
        alt: 'Grupo general de asistentes y organizadores del taller posando en el escenario del auditorio.',
      },
      {
        src: 'workshop-ml-2026/7.jpg',
        colSpan: 2,
        rowSpan: 1,
        title: 'Recorrido por áreas exteriores',
        description:
          'Grupo de participantes recorriendo senderos y jardines durante una actividad al aire libre.',
        alt: 'Participantes del evento caminando en grupo por un sendero rodeado de vegetación y flores.',
      },
      {
        src: 'workshop-ml-2026/8.jpg',
        colSpan: 1,
        rowSpan: 1,
        title: 'Banner oficial del taller',
        description:
          'Identidad visual y cartel informativo del taller internacional sobre Machine Learning y Clima Espacial.',
        alt: 'Cartel vertical del evento con logotipos de las entidades organizadoras y el título del taller.',
      },
      {
        src: 'workshop-ml-2026/9.jpg',
        colSpan: 1,
        rowSpan: 1,
        title: 'Participantes y colaboradoras junto al cartel del evento',
        description:
          'Asistentes y colaboradoras, entre ellas la Dra. Carolina Salas Matamoros, posando junto al banner institucional.',
        alt: 'Tres participantes posando sonrientes de pie frente al banner oficial del taller.',
      },
      {
        src: 'workshop-ml-2026/10.jpg',
        colSpan: 2,
        rowSpan: 1,
        title: 'Presentación sobre el Radio Observatorio de Santa Cruz',
        description:
          'La Dra. Carolina Salas Matamoros exponiendo detalles y avances vinculados al Radio Observatorio de Santa Cruz (ROSAC).',
        alt: 'Dra. Carolina Salas Matamoros en el podio presentando diapositivas sobre el Radio Observatorio de Santa Cruz.',
      },
      {
        src: 'workshop-ml-2026/11.jpg',
        colSpan: 1,
        rowSpan: 1,
        title: 'Exposición magistral de la Dra. Carolina Salas Matamoros',
        description:
          'La Dra. Carolina Salas Matamoros durante el desarrollo de una conferencia magistral desde el podio.',
        alt: 'Dra. Carolina Salas Matamoros dirigiéndose al auditorio con gestos explicativos desde el podio.',
      },
      {
        src: 'workshop-ml-2026/12.jpg',
        colSpan: 1,
        rowSpan: 1,
        title: 'Ponencia sobre modelado y Machine Learning',
        description:
          'Presentación técnica sobre el desarrollo de emuladores y modelos de aprendizaje automático en estudios ionosféricos.',
        alt: 'Expositor presentando diapositivas técnicas de machine learning aplicadas a irregularidades ionosféricas.',
      },
      {
        src: 'workshop-ml-2026/13.jpg',
        colSpan: 2,
        rowSpan: 1,
        title: 'Audiencia y participantes en el auditorio',
        description:
          'Vista general de los asistentes y participantes siguiendo con atención las exposiciones del programa.',
        alt: 'Participantes sentados en las butacas del auditorio escuchando una de las ponencias del evento.',
      },
      {
        src: 'workshop-ml-2026/14.jpg',
        colSpan: 1,
        rowSpan: 1,
        title: 'Charla técnica sobre clima espacial y eyecciones de masa',
        description:
          'Presentación académica en el auditorio con datos observacionales sobre eventos y dinámica solar.',
        alt: 'Expositor en el escenario junto a la pantalla que proyecta gráficas e imágenes de datos solares.',
      },
      {
        src: 'workshop-ml-2026/15.jpg',
        colSpan: 2,
        rowSpan: 2,
        title: 'Visita grupal al Jardín Botánico Lankester',
        description:
          'Fotografía de recuerdo de los participantes durante una visita al Jardín Botánico Lankester.',
        alt: 'Grupo de participantes posando en el exterior junto al rótulo del Jardín Botánico Lankester.',
      },
      {
        src: 'workshop-ml-2026/16.jpg',
        colSpan: 1,
        rowSpan: 2,
        title: 'Intervención protocolaria en el podio',
        description:
          'La Dra. Carolina Salas Matamoros en el atril durante una sesión protocolaria o de apertura.',
        alt: 'Dra. Carolina Salas Matamoros atenta a sus notas en el podio institucional junto a la bandera nacional.',
      },
      {
        src: 'workshop-ml-2026/17.jpg',
        colSpan: 1,
        rowSpan: 1,
        title: 'Vista panorámica del escenario durante la sesión técnica',
        description:
          'Perspectiva amplia del auditorio y el escenario durante la exposición de resultados científicos.',
        alt: 'Toma panorámica del escenario del auditorio con el ponente en el atril y la presentación proyectada en pantalla.',
      },
      {
        src: 'workshop-ml-2026/18.jpg',
        colSpan: 4,
        rowSpan: 2,
        title: 'Encuentro social en Restaurante y Mirador Ram Luna',
        description:
          'Participantes y organizadores reunidos durante una velada social con vista panorámica a la ciudad.',
        alt: 'Grupo de participantes reunidos de noche en el Restaurante y Mirador Ram Luna con la ciudad iluminada de fondo.',
      },
    ],
  },
]

await prisma.galleryMedia.deleteMany()

async function seedGalleryAlbum(
  album: SeedGalleryAlbum,
  parentAlbumId: string | null = null,
): Promise<void> {
  const fields = {
    title: album.title,
    description: album.description,
    yearsLabel: album.yearsLabel ?? null,
    parentAlbumId,
    coverObjectKey: `${galleryImageBase}/${album.cover}`,
  }

  const databaseAlbum = await prisma.galleryAlbum.upsert({
    where: { slug: album.slug },
    update: fields,
    create: { slug: album.slug, ...fields },
  })

  await prisma.galleryMedia.createMany({
    data: album.media.map((item, position) => ({
      ...galleryMediaDefaults,
      albumId: databaseAlbum.id,
      title: item.title,
      description: item.description,
      altText: item.alt,
      objectKey: `${galleryImageBase}/${item.src}`,
      colSpan: item.colSpan,
      rowSpan: item.rowSpan,
      position,
    })),
  })

  for (const subAlbum of album.subAlbums ?? []) {
    await seedGalleryAlbum(subAlbum, databaseAlbum.id)
  }
}

for (const album of galleryAlbums) {
  await seedGalleryAlbum(album)
}

await prisma.$disconnect()
