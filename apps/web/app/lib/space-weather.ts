export const spaceWeatherMeta = {
  title: 'Clima espacial | LASCE',
  description:
    'Conozca qué es el clima espacial, cómo se relaciona con la actividad solar y qué observa el Laboratorio de Ciencias Espaciales de la Universidad de Costa Rica.',
} as const

export const spaceWeatherHero = {
  kicker: 'Área de trabajo LASCE',
  title: 'Clima espacial',
  introduction:
    'El clima espacial describe las condiciones del entorno espacial cercanas a la Tierra: radiación, plasma y campos magnéticos que salen del Sol y luego interactúan con nuestra atmósfera y nuestro campo magnético.',
  image: {
    src: '/images/decorative/Solar-Flare.png',
    alt: 'Fulguración solar en el disco del Sol, un evento que libera radiación y material hacia el medio interplanetario.',
  },
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

export const spaceWeatherSolarActivity = {
  title: 'El Sol y el clima espacial',
  intro:
    'Casi todo el clima espacial nace en el Sol. La actividad de su atmósfera y de su campo magnético determina qué tan perturbado llega el entorno espacial hasta la Tierra.',
  figure: {
    src: '/images/decorative/Solar-Flare.png',
    alt: 'Región activa en el Sol, con material brillante expulsado desde la corona durante una fulguración.',
    caption:
      'Las fulguraciones son uno de los modos en que el Sol libera energía hacia el medio interplanetario.',
  },
  items: [
    {
      title: 'Manchas solares',
      description:
        'Son regiones más frías y con campo magnético intenso. Cuando hay muchas, el Sol suele estar más activo y aumentan las fulguraciones y las eyecciones.',
    },
    {
      title: 'Fulguraciones',
      description:
        'Son estallidos de radiación en la atmósfera solar. Llegan a la Tierra en minutos y pueden alterar la ionosfera del lado diurno.',
    },
    {
      title: 'Eyecciones de masa coronal',
      description:
        'Lanzan grandes nubes de plasma y campo magnético al espacio. Si apuntan hacia la Tierra, pueden provocar tormentas geomagnéticas al llegar, días después.',
    },
  ],
} as const

export const spaceWeatherImpacts = {
  title: 'Impactos en la Tierra',
  intro:
    'Cuando la cadena solar se intensifica, los efectos se notan sobre todo en tecnologías que dependen de la ionosfera, de órbitas o de redes eléctricas extensas. También hay un fenómeno visible: las auroras.',
  items: [
    {
      title: 'Telecomunicaciones',
      summary:
        'La ionosfera refracta y absorbe ondas de radio. Las fulguraciones pueden causar desvanecimientos en HF del lado diurno; las tormentas más intensas degradan comunicaciones de aviación y emergencia.',
      more: 'Las redes móviles cotidianas suelen ser menos sensibles que los sistemas HF de larga distancia, que sí dependen de la ionosfera.',
    },
    {
      title: 'Satélites',
      summary:
        'El viento solar y las partículas energéticas pueden cargar superficies, calentar la atmósfera alta y aumentar el arrastre sobre órbitas bajas.',
      more: 'El riesgo crece con eyecciones de masa coronal y eventos de protones, no con cualquier variación cotidiana del viento solar.',
    },
    {
      title: 'GPS y navegación',
      summary:
        'Los retardos y el centelleo en la ionosfera introducen errores de posicionamiento. Los receptores de precisión son más sensibles que la navegación cotidiana.',
      more: 'En latitudes bajas, como Costa Rica, los efectos suelen ser menores que en latitudes altas, aunque una tormenta intensa puede notarse también aquí.',
    },
    {
      title: 'Redes eléctricas',
      summary:
        'Las tormentas geomagnéticas inducen corrientes en líneas largas. Las redes de latitudes medias y altas son las más expuestas.',
      more: 'Estos efectos aparecen sobre todo en perturbaciones fuertes de la magnetosfera, no en el viento solar habitual.',
    },
    {
      title: 'Auroras',
      summary:
        'Cuando partículas solares entran por las regiones polares, excitan la atmósfera y producen auroras. Son la cara visible del clima espacial.',
      more: 'En tormentas muy intensas las auroras pueden verse más lejos de los polos. Son un efecto natural, no un daño por sí mismas.',
    },
    {
      title: 'Aviación y radiación',
      summary:
        'A gran altitud, sobre todo en rutas polares, aumenta la exposición a partículas energéticas durante algunos eventos solares.',
      more: 'Por eso el clima espacial también interesa a la aviación de larga distancia, además de a satélites y comunicaciones.',
    },
  ],
} as const

export const spaceWeatherLasce = {
  title: 'El trabajo de LASCE',
  paragraphs: [
    'El Laboratorio de Ciencias Espaciales de la Universidad de Costa Rica estudia el Sol y el entorno espacial para entender cómo la actividad solar se traduce en clima espacial.',
    'El trabajo combina observación, instrumentación y análisis: se sigue la actividad solar y se explora cómo esos cambios llegan a la magnetosfera y la ionosfera.',
    'Esta página ofrece un panorama general. Los proyectos, publicaciones, conjuntos de datos y herramientas de monitoreo se publicarán en sus propias secciones del portal.',
  ],
} as const

export const spaceWeatherBackLink = {
  href: '/#areas-de-trabajo',
  label: 'Volver a las áreas de trabajo',
} as const
