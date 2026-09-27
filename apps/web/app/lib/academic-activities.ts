export interface AcademicActivityResource {
  label: string
  href: string
}

export interface AcademicActivity {
  slug: string
  title: string
  category: string
  date: string
  location?: string
  abstract: string
  description: string
  imageUrl: string
  imageAlt: string
  resources?: AcademicActivityResource[]
}

export const academicActivities: AcademicActivity[] = [
  {
    slug: 'machine-learning-workshop',
    title: '2026 Workshop on Machine Learning Applied to Space Weather and GNSS',
    category: 'Taller',
    date: '16-20 febrero, 2026',
    location: 'San José, Costa Rica',
    abstract:
      'Taller enfocado en el estudio de la relación Sol-Tierra, el análisis de datos científicos y la aplicación de técnicas de inteligencia artificial y aprendizaje automático al clima espacial y los sistemas GNSS.',
    description: [
      'En el marco del proyecto LASCE se realizó, del 16 al 20 de febrero de 2026 en San José, Costa Rica, el Taller sobre Aprendizaje Automático Aplicado al Clima Espacial y a los Sistemas Globales de Navegación por Satélite (GNSS). La actividad reunió durante cinco días a estudiantes, jóvenes investigadores y especialistas para fortalecer sus capacidades en el estudio de la relación Sol-Tierra, el análisis de datos científicos y la aplicación de técnicas de inteligencia artificial y aprendizaje automático al clima espacial.',
      'El programa combinó conferencias, sesiones de discusión y prácticas computacionales dedicadas a los procesos ionosféricos, los efectos del clima espacial sobre los sistemas GNSS, la computación científica y el análisis de datos mediante herramientas de aprendizaje automático. Este enfoque permitió integrar la comprensión física de los fenómenos solares y terrestres con métodos modernos de procesamiento, modelado y predicción, promoviendo además el uso de datos abiertos y procedimientos reproducibles.',
      'El taller contó con 52 participantes presenciales procedentes de 17 países; el 37,2 % fueron mujeres y el 70 % provenía de países en desarrollo. Fue organizado con la participación del Centro de Investigaciones Espaciales de la Universidad de Costa Rica, la Oficina de las Naciones Unidas para Asuntos del Espacio Ultraterrestre, el Comité Internacional sobre los GNSS, COSPAR, INGV y SCOSTEP, junto con contribuciones de la Universidad Nacional de Tucumán y el Centro Internacional de Física Teórica Abdus Salam.',
      'Esta actividad fortaleció la proyección internacional del LASCE, amplió las redes de colaboración científica y contribuyó a la formación de capacidades regionales para investigar, monitorear y predecir los efectos del clima espacial sobre la ionosfera y los sistemas tecnológicos. Asimismo, generó un espacio para identificar nuevos desafíos científicos, oportunidades de cooperación y futuras iniciativas que integren la física del clima espacial con herramientas avanzadas de análisis de datos.',
    ].join('\n\n'),
    imageUrl: '/images/galeria/workshop-ml-2026/1.jpg',
    imageAlt:
      'Comité y participantes junto al cartel oficial del taller de Machine Learning y clima espacial',
    resources: [
      {
        label: 'Ver galería de fotos del taller',
        href: '/galeria/workshop-ml-2026',
      },
    ],
  },
]

export const academicActivitySlugs = academicActivities.map((activity) => activity.slug)

export function getAcademicActivities(): AcademicActivity[] {
  return academicActivities
}

export function getAcademicActivity(slug: string): AcademicActivity | undefined {
  return academicActivities.find((activity) => activity.slug === slug)
}
