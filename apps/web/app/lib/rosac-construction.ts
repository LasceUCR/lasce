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

// Photos live in one subfolder per stage now (moved there directly on disk), rather than all
// flat under a single directory -- folder names carry spaces, so they are percent-encoded here
// (`%20`) rather than left as literal spaces in the URL.
const preparacionBase = '/images/ROSAC/construction/Preparacion%20Montaje'
const estructuraBase = '/images/ROSAC/construction/Montaje'
const panelesBase = '/images/ROSAC/construction/Montaje%20Paneles'
const fotogrametriaBase = '/images/ROSAC/construction/Fotogrametria'
const instalacionBase = '/images/ROSAC/construction/Intalacion%20Electrica'

// Editorial copy supplied for this PBI is provisional, pending LASCE validation ("ROSAC
// Construction Process" PBI). Stage order follows that PBI's required process order
// (Preparation, Structure assembly, Panel assembly, Photogrammetry and panel leveling,
// Electrical installation). The structure/panel split was confirmed once real photos for each
// were sourced and sorted into their own folders on disk -- the newer photos in "Montaje" and
// "Montaje Paneles" back up the original split read from alt text alone. The "EATON equipment
// donation" stage this section used to show has been dropped: it is not one of the PBI's five
// stages.
export const rosacConstructionContent = {
  title: 'Construcción del ROSAC',
  intro:
    'El desarrollo del Radio Observatorio de Santa Cruz ha involucrado distintas etapas de estudio, preparación, montaje y adecuación de su infraestructura. Este recorrido presenta algunos de los trabajos realizados durante ese proceso.',
  stages: [
    {
      id: 'preparacion',
      title: 'Preparación para el montaje',
      navigationLabel: 'Preparación',
      description:
        'Antes del montaje principal se realizaron trabajos de preparación del sitio y de los componentes que posteriormente formarían parte de la estructura. Esta etapa reúne parte de la logística y adecuación previa necesaria para iniciar el ensamblaje.',
      images: [
        {
          src: `${preparacionBase}/prev_montaje_1.jpg`,
          alt: 'Personas sobre y alrededor de una base de concreto, con una antena al fondo.',
        },
        {
          src: `${preparacionBase}/prev_montaje_2.jpg`,
          alt: 'Camión con grúa y componentes metálicos junto al sitio de la antena.',
        },
        {
          src: `${preparacionBase}/prev_montaje_3.jpg`,
          alt: 'Base circular de concreto con pernos de anclaje y agua acumulada en su interior, junto a una antena parabólica pequeña.',
        },
        {
          src: `${preparacionBase}/prev_montaje_4.jpg`,
          alt: 'Montacargas transporta un componente cilíndrico metálico envuelto y asegurado con correas.',
        },
        {
          src: `${preparacionBase}/prev_montaje_5.jpg`,
          alt: 'Vista a nivel del suelo de la base circular de concreto, con pernos de anclaje y una placa metálica oxidada en primer plano.',
        },
      ],
    },
    {
      id: 'estructura',
      title: 'Montaje de la estructura',
      navigationLabel: 'Estructura',
      description:
        'El montaje integró progresivamente los componentes principales de la estructura del radiotelescopio. Las fotografías muestran el posicionamiento y la elevación de estos elementos con grúa, antes de que el reflector recibiera sus paneles.',
      images: [
        {
          src: `${estructuraBase}/montaje_1.jpeg`,
          alt: 'Grúa situada sobre un soporte cilíndrico durante los trabajos de montaje.',
        },
        {
          src: `${estructuraBase}/montaje_2.jpeg`,
          alt: 'Componente metálico con baranda suspendido junto al soporte de la antena.',
        },
        {
          src: `${estructuraBase}/montaje_3.jpg`,
          alt: 'Vista desde abajo del vértice central de la estructura radial de la antena, con dos personas trabajando junto a él.',
        },
        {
          src: `${estructuraBase}/montaje_4.jpg`,
          alt: 'Dos personas trabajan sobre una plataforma con el mecanismo motorizado de rotación de la antena, con una grúa al fondo.',
        },
        {
          src: `${estructuraBase}/montaje_5.jpg`,
          alt: 'Grúa móvil y camión junto a una base cónica metálica de gran tamaño, colocada sobre el pasto.',
        },
      ],
    },
    {
      id: 'paneles',
      title: 'Montaje de paneles',
      navigationLabel: 'Paneles',
      description:
        'Con la estructura ya montada, el trabajo continuó sobre el reflector con la instalación de sus paneles. Las fotografías muestran los trabajos realizados directamente sobre la antena, incluyendo el traslado de paneles hasta su posición final.',
      images: [
        {
          src: `${panelesBase}/montaje_1.jpg`,
          alt: 'Persona asegura con cadenas un panel curvo del reflector sobre el pasto, junto a una plataforma elevadora.',
        },
        {
          src: `${panelesBase}/montaje_2.jpg`,
          alt: 'Vista aérea de una persona en una plataforma elevadora izando un panel triangular del reflector con cuerdas.',
        },
        {
          src: `${panelesBase}/montaje_3.jpeg`,
          alt: 'Plataforma elevadora junto a la estructura metálica del reflector.',
        },
        {
          src: `${panelesBase}/montaje_4.jpg`,
          alt: 'Grupo de personas en la base de la antena, bajo la estructura del reflector.',
        },
        {
          src: `${panelesBase}/montaje_5.jpg`,
          alt: 'Personas en una plataforma elevadora junto a la antena, con un panel suspendido.',
        },
      ],
    },
    {
      id: 'fotogrametria',
      title: 'Fotogrametría y nivelación de paneles',
      navigationLabel: 'Fotogrametría',
      description:
        'Una vez instalados los paneles del reflector, se realizaron trabajos de observación y levantamiento fotogramétrico para verificar la geometría y nivelación de la superficie resultante. Estas labores permitieron documentar las condiciones de la antena tras el montaje.',
      images: [
        {
          src: `${fotogrametriaBase}/Fotogrametria_1.jpg`,
          alt: 'Vista nocturna de dos antenas y una plataforma elevadora junto a una de ellas.',
        },
        {
          src: `${fotogrametriaBase}/Fotogrametria_2.jpeg`,
          alt: 'Dos personas trabajan junto a la abertura central del reflector de la antena.',
        },
        {
          src: `${fotogrametriaBase}/Fotogrametria_3.jpeg`,
          alt: 'Dos personas sentadas sobre la superficie ya ensamblada del reflector, midiendo con una regla metálica junto a la abertura central.',
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
          src: `${instalacionBase}/elect_1.jpeg`,
          alt: 'Persona junto a los mecanismos y el cableado bajo la estructura de la antena.',
        },
        {
          src: `${instalacionBase}/elect_2.jpg`,
          alt: 'Equipo de trabajo reunido frente a la base de la antena.',
        },
        {
          src: `${instalacionBase}/elect_3.jpeg`,
          alt: 'Personas y cables junto a una edificación cercana a la antena.',
        },
        {
          src: `${instalacionBase}/elect_4.jpeg`,
          alt: 'Persona manipulando cables junto a un tablero eléctrico abierto.',
        },
        {
          src: `${instalacionBase}/elect_5.jpeg`,
          alt: 'Personas trabajando en la plataforma bajo el reflector, junto a cables y la estructura.',
        },
      ],
    },
  ],
} as const satisfies ConstructionContent
