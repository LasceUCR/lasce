import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AccessDenied } from '@/app/components/administracion/AccessDenied'
import { AdminPlaceholder } from '@/app/components/administracion/AdminPlaceholder'
import { RolePermissionsEditor } from '@/app/components/administracion/RolePermissionsEditor'
import { UserRoleAssignment } from '@/app/components/administracion/UserRoleAssignment'
import { adminSections, getAdminSection } from '@/app/lib/admin-sections'
import { requirePermission } from '@/app/lib/auth/authorization'
import { PERMISSION_DENIED } from '@/app/lib/auth/permissions'
import { getPermissionMatrix } from '@/app/lib/role-permissions'
import { availableRoles, getUserOverview } from '@/app/lib/user-administration'
import { saveRolePermissions } from '../permission-actions'
import { saveUserRole } from '../user-actions'

type AdministracionSectionPageProps = {
  params: Promise<{ section: string }>
}

export const dynamic = 'force-dynamic'

export function generateStaticParams() {
  return adminSections.map(({ slug }) => ({ section: slug }))
}

export async function generateMetadata({
  params,
}: AdministracionSectionPageProps): Promise<Metadata> {
  const { section } = await params
  const content = getAdminSection(section)

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
  const content = getAdminSection(section)

  if (!content) {
    notFound()
  }

  if (section === 'usuarios') {
    const { user, allowed } = await requirePermission('manage_users', '/administracion/usuarios')
    if (!allowed) {
      return <AccessDenied message={PERMISSION_DENIED.manage_users} />
    }
    const users = await getUserOverview()
    return (
      <UserRoleAssignment
        currentUserId={user.id}
        key={JSON.stringify(users)}
        users={users}
        roles={availableRoles()}
        saveAction={saveUserRole}
        description={content.description}
        title={content.title}
      />
    )
  }

  if (section === 'permisos') {
    const { allowed } = await requirePermission('manage_permissions', '/administracion/permisos')
    if (!allowed) {
      return <AccessDenied message={PERMISSION_DENIED.manage_permissions} />
    }
    const matrix = await getPermissionMatrix()
    return (
      <RolePermissionsEditor
        title={content.title}
        description={content.description}
        roles={availableRoles()}
        matrix={matrix}
        saveAction={saveRolePermissions}
      />
    )
  }

  if (content.permission) {
    const { allowed } = await requirePermission(content.permission, `/administracion/${section}`)
    if (!allowed) {
      return <AccessDenied message={PERMISSION_DENIED[content.permission]} />
    }
  }

  return <AdminPlaceholder description={content.description} title={content.title} />
}
