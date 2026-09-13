import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AdminPlaceholder } from '@/app/components/administracion/AdminPlaceholder'
import { UsersOverviewPage } from '@/app/components/administracion/UsersOverviewPage'
import { demoRoles, demoUsers } from '@/app/lib/user-overview-demo'

const administracionSections = {
  descargas: {
    title: 'Descargas',
    description: 'Historial y control de descargas de datos del laboratorio.',
  },
  usuarios: {
    title: 'Usuarios',
    description: 'Consulta los usuarios registrados y sus roles actuales.',
  },
  infraestructura: {
    title: 'Infraestructura',
    description: 'Estado de los servicios, procesos e instrumentos del laboratorio.',
  },
} as const

type AdministracionSection = keyof typeof administracionSections

type AdministracionSectionPageProps = {
  params: Promise<{ section: string }>
}

function getPageContent(section: string) {
  if (section in administracionSections) {
    return administracionSections[section as AdministracionSection]
  }

  return null
}

export const dynamicParams = false

export function generateStaticParams() {
  return Object.keys(administracionSections).map((section) => ({ section }))
}

export async function generateMetadata({
  params,
}: AdministracionSectionPageProps): Promise<Metadata> {
  const { section } = await params
  const content = getPageContent(section)

  if (!content) {
    return {}
  }

  return {
    title: `${content.title} | Administración | LASCE`,
    description: content.description,
  }
}

export default async function AdministracionSectionPage({
  params,
}: AdministracionSectionPageProps) {
  const { section } = await params
  const content = getPageContent(section)

  if (!content) {
    notFound()
  }

  if (section === 'usuarios') {
    return (
      <UsersOverviewPage
        description={content.description}
        title={content.title}
        users={demoUsers}
        roles={demoRoles}
        isDemo
      />
    )
  }

  return <AdminPlaceholder description={content.description} title={content.title} />
}
