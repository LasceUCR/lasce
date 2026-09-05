export const spaceWeatherMeta = {
  title: 'Clima espacial | LASCE',
  description:
    'Qué es el clima espacial, cómo se relaciona con la actividad solar y por qué se estudia desde Costa Rica en el Laboratorio de Ciencias Espaciales de la Universidad de Costa Rica.',
} as const

export const spaceWeatherHero = {
  kicker: 'Área de trabajo LASCE',
  title: 'Clima espacial',
} as const

export const spaceWeatherDefinition = {
  title: '¿Qué es el clima espacial?',
  paragraphs: [
    'El clima espacial describe las condiciones variables del Sol, el viento solar y la ionosfera que pueden influir en las inmediaciones de la Tierra y en los sistemas tecnológicos. No es el clima atmosférico cotidiano: se origina principalmente en la actividad solar y se manifiesta en el entorno espacial de nuestro planeta.',
  ],
} as const

export const spaceWeatherSunToEarth = {
  title: 'Del Sol a la Tierra',
  items: [
    {
      title: 'El Sol libera energía',
      description:
        'Los ‘flares’ producen incrementos intensos de radiación y se asocian al origen de las eyecciones de masa coronal (CMEs, por sus siglas en inglés), las cuales son grandes estructuras de plasma y campo magnético. Algunos de estos eventos aceleran partículas a altas energías.',
    },
    {
      title: 'La perturbación se propaga',
      description:
        'La radiación electromagnética llega en unos ocho minutos, mientras que partículas y los CMEs viajan por el medio interplanetario en escalas de minutos y de horas a días, respectivamente.',
    },
    {
      title: 'El entorno terrestre responde',
      description:
        'Si la perturbación alcanza la Tierra con condiciones apropiadas, puede producir tormentas geomagnéticas o alteraciones ionosféricas.',
    },
    {
      title: 'La tecnología puede verse afectada',
      description:
        'Entre los sistemas sensibles se encuentran las comunicaciones por radio, la navegación GNSS, los satélites, las redes eléctricas y las operaciones espaciales y aeronáuticas.',
    },
  ],
} as const

export const spaceWeatherCostaRica = {
  title: '¿Por qué estudiarlo desde Costa Rica?',
  paragraphs: [
    'La respuesta de la ionosfera y el desempeño de sistemas tecnológicos pueden depender de la ubicación geográfica y geomagnética. Contar con observaciones y análisis realizados desde Costa Rica permite caracterizar mejor el entorno regional, aportar datos a redes globales y formar capacidades científicas propias. Para un país cada vez más dependiente de navegación satelital, telecomunicaciones e infraestructura digital, comprender el clima espacial es una inversión en conocimiento.',
  ],
} as const

export const spaceWeatherComponents = {
  title: '¿Qué compone el clima espacial?',
  intro:
    'No es un solo fenómeno: es una cadena que empieza en el Sol y termina en la Tierra. Cada eslabón modifica al siguiente.',
  items: [
    {
      title: 'Actividad solar',
      description:
        'El Sol no está quieto. Las manchas, las fulguraciones y las eyecciones de masa coronal liberan energía, partículas y campos magnéticos al espacio.',
    },
    {
      title: 'Viento solar',
      description:
        'Es un flujo continuo de plasma que sale de la corona solar. Su velocidad, densidad y campo magnético cambian según lo que ocurra en el Sol.',
    },
    {
      title: 'Magnetosfera',
      description:
        'El campo magnético terrestre desvía la mayor parte del viento solar. Cuando ese flujo se intensifica, la magnetosfera se comprime y puede perturbarse.',
    },
    {
      title: 'Ionosfera',
      description:
        'Es la capa alta de la atmósfera, ionizada por la radiación solar. Los cambios en esa capa afectan radio, GPS y otras comunicaciones.',
    },
    {
      title: 'Tormentas geomagnéticas',
      description:
        'Surgen cuando el viento solar y el campo magnético interplanetario perturban con fuerza la magnetosfera. Pueden durar horas o días.',
    },
    {
      title: 'Radiación de partículas',
      description:
        'El Sol también puede enviar protones y otras partículas energéticas. Ese flujo es distinto del viento solar cotidiano y puede afectar satélites y vuelos polares.',
    },
  ],
  flow: {
    title: 'Flujo conceptual',
    steps: ['Sol', 'Viento solar', 'Magnetosfera', 'Tierra'] as const,
    caption:
      'La actividad del Sol alimenta el viento solar; ese flujo golpea la magnetosfera y, desde ahí, se manifiestan efectos en la Tierra.',
  },
} as const

export const spaceWeatherBackLink = {
  href: '/#areas-de-trabajo',
  label: 'Volver a las áreas de trabajo',
} as const
