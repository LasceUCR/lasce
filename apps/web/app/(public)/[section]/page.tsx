import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

const publicSections = {
  nosotros: {
    title: 'Nosotros',
    description:
      'Conozca la misión, el equipo y el trabajo del Laboratorio de Ciencias Espaciales de la Universidad de Costa Rica.',
  },
  investigacion: {
    title: 'Investigación',
    description:
      'Explore las líneas de investigación sobre física solar, clima espacial y radioastronomía desarrolladas por LASCE.',
  },
  instrumentacion: {
    title: 'Instrumentación',
    description:
      'Consulte los instrumentos, observatorios y capacidades técnicas que respaldan la investigación del laboratorio.',
  },
  datos: {
    title: 'Datos',
    description:
      'Acceda a indicadores, observaciones y productos científicos publicados por las distintas áreas de LASCE.',
  },
  noticias: {
    title: 'Noticias',
    description:
      'Encuentre novedades, actividades y resultados recientes del Laboratorio de Ciencias Espaciales.',
  },
  contacto: {
    title: 'Contacto',
    description:
      'Consulte los canales oficiales para comunicarse con el laboratorio y conocer su ubicación en la Universidad de Costa Rica.',
  },
} as const

type PublicSection = keyof typeof publicSections
type PublicSectionPageProps = {
  params: Promise<{ section: string }>
}

export const dynamicParams = false

export function generateStaticParams() {
  return Object.keys(publicSections).map((section) => ({ section }))
}

export async function generateMetadata({ params }: PublicSectionPageProps): Promise<Metadata> {
  const { section } = await params
  const content = publicSections[section as PublicSection]

  if (!content) {
    return {}
  }

  return {
    title: `${content.title} | LASCE`,
    description: content.description,
  }
}

export default async function PublicSectionPage({ params }: PublicSectionPageProps) {
  const { section } = await params
  const content = publicSections[section as PublicSection]

  if (!content) {
    notFound()
  }

  return (
    <div className="public-route">
      <div className="public-route-content">
        <span className="public-route-kicker">Portal público LASCE</span>
        <h1>{content.title}</h1>
        <p>{content.description}</p>
        <span className="public-route-status">Contenido en preparación</span>
        <Link className="public-route-back" href="/">
          <ArrowLeft aria-hidden="true" size={18} strokeWidth={1.8} />
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
