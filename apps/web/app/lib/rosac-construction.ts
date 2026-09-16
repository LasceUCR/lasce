export interface ConstructionImage {
  src: string
  alt: string
}

export interface ConstructionStage {
  id: string
  title: string
  navigationLabel: string
  description: string
  images: readonly [ConstructionImage, ...ConstructionImage[]]
}

export interface ConstructionContent {
  title: string
  intro: string
  stages: readonly [ConstructionStage, ...ConstructionStage[]]
}

const imageBase = '/images/ROSAC/construction'

// Editorial copy supplied for this PBI is provisional, pending LASCE validation.
// Stage order is narrative, not a claim about dated milestones. Preserve filename order.
export const rosacConstructionContent = {
  title: 'Construcción del ROSAC',
  intro:
    'El desarrollo del Radio Observatorio de Santa Cruz ha involucrado distintas etapas de estudio, preparación, montaje y adecuación de su infraestructura. Este recorrido presenta algunos de los trabajos realizados durante ese proceso.',
  stages: [
    {
      id: 'fotogrametria',
      title: 'Estudios y fotogrametría',
      navigationLabel: 'Estudios',
      description:
        'Los trabajos iniciales incluyeron actividades de observación, levantamiento y documentación de la infraestructura existente. Estas labores permitieron estudiar la geometría y las condiciones de la antena como parte de la preparación de las intervenciones posteriores.',
      images: [
        {
          src: `${imageBase}/Fotogrametria_1.jpg`,
          alt: 'Vista nocturna de dos antenas y una plataforma elevadora junto a una de ellas.',
        },
        {
          src: `${imageBase}/Fotogrametria_2.jpeg`,
          alt: 'Dos personas trabajan junto a la abertura central del reflector de la antena.',
        },
      ],
    },
    {
      id: 'preparacion',
      title: 'Preparación para el montaje',
      navigationLabel: 'Preparación',
      description:
        'Antes del montaje principal se realizaron trabajos de preparación del sitio y de los componentes que posteriormente formarían parte de la estructura. Esta etapa reúne parte de la logística y adecuación previa necesaria para iniciar el ensamblaje.',
      images: [
        {
          src: `${imageBase}/prev_montaje_1.jpeg`,
          alt: 'Personas sobre y alrededor de una base de concreto, con una antena al fondo.',
        },
        {
          src: `${imageBase}/prev_montaje_2.png`,
          alt: 'Camión con grúa y componentes metálicos junto al sitio de la antena.',
        },
      ],
    },
    {
      id: 'montaje',
      title: 'Montaje de la estructura',
      navigationLabel: 'Montaje',
      description:
        'El montaje integró progresivamente los distintos componentes de la estructura del radiotelescopio. Las fotografías muestran varias fases del proceso, desde el posicionamiento y elevación de elementos principales hasta los trabajos realizados directamente sobre la estructura de la antena.',
      images: [
        {
          src: `${imageBase}/montaje_1.jpeg`,
          alt: 'Grúa situada sobre un soporte cilíndrico durante los trabajos de montaje.',
        },
        {
          src: `${imageBase}/montaje_2.jpeg`,
          alt: 'Componente metálico con baranda suspendido junto al soporte de la antena.',
        },
        {
          src: `${imageBase}/montaje_3.jpeg`,
          alt: 'Plataforma elevadora junto a la estructura metálica del reflector.',
        },
        {
          src: `${imageBase}/montaje_4.jpeg`,
          alt: 'Grupo de personas en la base de la antena, bajo la estructura del reflector.',
        },
        {
          src: `${imageBase}/montaje_5.jpg`,
          alt: 'Personas en una plataforma elevadora junto a la antena, con un panel suspendido.',
        },
      ],
    },
    {
      id: 'eaton',
      title: 'Donación de equipo EATON',
      navigationLabel: 'EATON',
      description:
        'Como parte del desarrollo de la infraestructura del ROSAC, se recibió equipo de EATON relacionado con las necesidades eléctricas del observatorio. Este aporte se incorporó al proceso de adecuación de los sistemas requeridos para la operación de la instalación.',
      images: [
        {
          src: `${imageBase}/EATON_1.jpeg`,
          alt: 'Grupo de personas junto a equipos y tableros eléctricos en un pasillo.',
        },
      ],
    },
    {
      id: 'instalacion',
      title: 'Instalación eléctrica',
      navigationLabel: 'Instalación',
      description:
        'La adecuación eléctrica comprendió trabajos sobre diferentes puntos de la infraestructura del observatorio. Las fotografías documentan la instalación y conexión de componentes eléctricos, trabajos de cableado y labores realizadas tanto en el entorno de la antena como en sus sistemas asociados.',
      images: [
        {
          src: `${imageBase}/elect_1.jpeg`,
          alt: 'Persona junto a los mecanismos y el cableado bajo la estructura de la antena.',
        },
        {
          src: `${imageBase}/elect_2.jpg`,
          alt: 'Equipo de trabajo reunido frente a la base de la antena.',
        },
        {
          src: `${imageBase}/elect_3.jpeg`,
          alt: 'Personas y cables junto a una edificación cercana a la antena.',
        },
        {
          src: `${imageBase}/elect_4.jpeg`,
          alt: 'Persona manipulando cables junto a un tablero eléctrico abierto.',
        },
        {
          src: `${imageBase}/elect_5.jpeg`,
          alt: 'Personas trabajando en la plataforma bajo el reflector, junto a cables y la estructura.',
        },
      ],
    },
  ],
} as const satisfies ConstructionContent
