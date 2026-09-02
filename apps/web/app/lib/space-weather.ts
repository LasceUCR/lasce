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
  mockNotice: 'Los indicadores y la gráfica de esta página son datos simulados para ilustrar la estructura del portal.',
} as const

export const spaceWeatherComponents = {
  title: '¿Qué compone el clima espacial?',
  intro:
    'El clima espacial no es un solo fenómeno: es una cadena que empieza en el Sol y termina en la Tierra. Cada eslabón modifica al siguiente.',
  items: [
    {
      title: 'Actividad solar',
      description:
        'El Sol no está quieto. Las manchas, las fulguraciones y las eyecciones de masa coronal liberan energía, partículas y campos magnéticos al espacio.',
    },
    {
      title: 'Viento solar',
      description:
        'Es un flujo continuo de plasma que sale de la corona solar. Su velocidad y densidad cambian según la actividad del Sol y arrastran el campo magnético interplanetario.',
    },
    {
      title: 'Magnetosfera',
      description:
        'El campo magnético terrestre desvía la mayor parte del viento solar. Cuando ese flujo se intensifica, la magnetosfera se comprime y puede perturbarse.',
    },
    {
      title: 'Ionosfera',
      description:
        'Es la capa alta de la atmósfera, ionizada por la radiación solar. Las fulguraciones y las tormentas geomagnéticas alteran su densidad y afectan radio, GPS y comunicaciones.',
    },
  ],
  flow: {
    title: 'Flujo conceptual',
    steps: ['Sol', 'Viento solar', 'Magnetosfera', 'Tierra'] as const,
    caption:
      'La actividad del Sol alimenta el viento solar; ese flujo golpea la magnetosfera y, desde ahí, se manifiestan efectos en la Tierra.',
  },
} as const

export const spaceWeatherIndicators = {
  title: 'Indicadores actuales',
  mockLabel: 'Datos simulados',
  updatedAt: '2 de septiembre de 2026, 12:00 UTC',
  items: [
    {
      label: 'Índice Kp',
      value: '3',
      status: 'Inquieto',
      detail: 'Mide la perturbación geomagnética global (0 a 9). Un valor 3 indica inquietud, todavía por debajo de una tormenta (Kp 5).',
      tone: 'teal',
    },
    {
      label: 'Viento solar',
      value: '420 km/s',
      status: 'Normal',
      detail: 'La velocidad típica del viento solar lento ronda 350–450 km/s. 420 km/s es un flujo habitual, no un evento extremo.',
      tone: 'cyan',
    },
    {
      label: 'Rayos X',
      value: 'C2.4',
      status: 'Moderado',
      detail: 'Clase C: fulguración moderada. Es más intensa que una clase B (baja) y mucho menor que una M o X, asociadas a impactos mayores.',
      tone: 'blue',
    },
    {
      label: 'Protones',
      value: '1.2 pfu',
      status: 'Bajo',
      detail: 'Flujo de protones energéticos cerca del fondo. No hay tormenta de radiación solar (esas suelen superar 10 pfu).',
      tone: 'teal',
    },
  ],
} as const

export type SpaceWeatherIndicator = (typeof spaceWeatherIndicators.items)[number]

export const spaceWeatherChart = {
  title: 'Actividad geomagnética (últimas 24 h)',
  description:
    'El índice Kp se mantuvo entre 1 y 2 durante la madrugada y subió hasta 3 hacia el mediodía UTC, en coherencia con un viento solar que pasó de unos 365 km/s a 420 km/s tras la fulguración C2.4. El umbral de tormenta menor (Kp 5) no se alcanzó.',
  yLabel: 'Índice Kp',
  stormThreshold: 5,
  stormThresholdLabel: 'Umbral de tormenta menor (Kp 5)',
  points: [
    { hour: '00:00', kp: 1.3, wind: 365 },
    { hour: '03:00', kp: 1.6, wind: 372 },
    { hour: '06:00', kp: 1.8, wind: 381 },
    { hour: '09:00', kp: 2.4, wind: 398 },
    { hour: '12:00', kp: 3.0, wind: 420 },
    { hour: '15:00', kp: 2.7, wind: 414 },
    { hour: '18:00', kp: 2.2, wind: 405 },
    { hour: '21:00', kp: 1.9, wind: 392 },
  ],
} as const

export type SpaceWeatherChartPoint = (typeof spaceWeatherChart.points)[number]

export const spaceWeatherStatus = {
  title: 'Estado actual y alertas',
  level: 'Vigilancia',
  levelDescription: 'Condiciones inquietas, sin tormenta',
  summary:
    'Hay una fulguración moderada clase C y un Kp inquieto. El conjunto es coherente: el Sol está activo a un nivel cotidiano, el viento solar es normal y la magnetosfera apenas se ha perturbado.',
  alerts: [
    'Sin alerta de tormenta geomagnética (G1 o superior).',
    'Fulguración C2.4 observada; no hay aumento relevante de protones.',
  ],
  forecast:
    'Se espera que el Kp se mantenga entre 2 y 4 en las próximas 24 horas. No se anticipa una tormenta geomagnética ni un evento de radiación.',
} as const

export const spaceWeatherImpacts = {
  title: 'Impactos en la Tierra',
  intro:
    'Con los valores simulados de hoy el impacto práctico es bajo. Las tarjetas describen qué suele ocurrir cuando cada eslabón de la cadena se intensifica.',
  items: [
    {
      title: 'Telecomunicaciones',
      summary:
        'La ionosfera refracta y absorbe ondas de radio. Una fulguración C puede causar desvanecimientos breves en HF del lado diurno; no suele interrumpir redes móviles.',
      more: 'Durante tormentas fuertes, las comunicaciones HF de aviación y emergencia se degradan. En el escenario actual (C2.4 y protones bajos) el efecto esperado es local y temporal.',
    },
    {
      title: 'Satélites',
      summary:
        'El viento solar y las partículas energéticas cargan superficies, calientan la atmósfera alta y aumentan el arrastre sobre órbitas bajas.',
      more: 'Con 420 km/s y 1.2 pfu el ambiente es cercano al promedio. El riesgo crece con eyecciones de masa coronal y tormentas de protones, no con una fulguración C aislada.',
    },
    {
      title: 'GPS y navegación',
      summary:
        'Los retardos en la ionosfera introducen errores de posicionamiento. Un Kp 3 puede aumentar el centelleo, sobre todo en latitudes altas.',
      more: 'Los receptores de precisión (agricultura, aviación) son más sensibles. En Costa Rica, a baja latitud, un Kp 3 rara vez produce fallos evidentes en navegación cotidiana.',
    },
    {
      title: 'Redes eléctricas',
      summary:
        'Las tormentas geomagnéticas inducen corrientes en líneas largas. Eso ocurre sobre todo con Kp 5 o más, no con el nivel inquieto de este escenario.',
      more: 'Las redes de latitudes medias y altas son las más expuestas. El caso simulado permanece por debajo del umbral operativo habitual de alerta.',
    },
  ],
} as const

export const spaceWeatherLasce = {
  title: 'El trabajo de LASCE',
  paragraphs: [
    'El Laboratorio de Ciencias Espaciales de la Universidad de Costa Rica estudia el Sol y el entorno espacial para entender cómo la actividad solar se traduce en clima espacial.',
    'El trabajo combina observación, instrumentación y análisis: se sigue la actividad solar, se interpretan indicadores del medio interplanetario y se explora cómo esos cambios llegan a la magnetosfera y la ionosfera.',
    'Esta página ofrece un panorama general. Los proyectos, publicaciones, conjuntos de datos y herramientas de monitoreo se publicarán en sus propias secciones del portal.',
  ],
} as const

export const spaceWeatherBackLink = {
  href: '/#areas-de-trabajo',
  label: 'Volver a las áreas de trabajo',
} as const
