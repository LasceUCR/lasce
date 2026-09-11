import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { isWorkAreaSlug, workAreaSlugs, workAreas } from '@/app/lib/work-areas'

const excludedDynamicWorkAreaSlugs = new Set(['clima-espacial', 'fisica-solar', 'radioastronomia'])

const publicSections = {
  contacto: {
    title: 'Contacto',
    description:
      'Consulte los canales oficiales para comunicarse con el laboratorio y conocer su ubicación en la Universidad de Costa Rica.',
  },
} as const

type PublicSection = keyof typeof publicSections

type PublicPageContent = {
  title: string
  description: string
  kicker: string
}

type PublicSectionPageProps = {
  params: Promise<{ section: string }>
}

function getPageContent(section: string): PublicPageContent | null {
  if (isWorkAreaSlug(section)) {
    return {
      ...workAreas[section],
      kicker: 'Área de trabajo LASCE',
    }
  }

  if (section in publicSections) {
    return {
      ...publicSections[section as PublicSection],
      kicker: 'Portal público LASCE',
    }
  }

  return null
}

export const dynamicParams = false

export function generateStaticParams() {
  return [
    ...Object.keys(publicSections),
    ...workAreaSlugs.filter((section) => !excludedDynamicWorkAreaSlugs.has(section)),
  ].map((section) => ({ section }))
}

export async function generateMetadata({ params }: PublicSectionPageProps): Promise<Metadata> {
  const { section } = await params
  const content = getPageContent(section)

  if (!content) {
    return {}
  }

  return {
    title: `${content.title} | LASCE`,
    description: content.description,
    alternates: { canonical: `/${section}` },
  }
}

export default async function PublicSectionPage({ params }: PublicSectionPageProps) {
  const { section } = await params
  const content = getPageContent(section)

  if (!content) {
    notFound()
  }

  return (
    <div className="public-route">
      <div className="public-route-content">
        <span className="public-route-kicker">{content.kicker}</span>
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
