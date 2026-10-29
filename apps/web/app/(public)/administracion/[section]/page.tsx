import type { UserRole } from '@lasce/db'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getMessages, getTranslations } from 'next-intl/server'

import { AccessDenied } from '@/app/components/administracion/AccessDenied'
import { AdminPlaceholder } from '@/app/components/administracion/AdminPlaceholder'
import { RolePermissionsEditor } from '@/app/components/administracion/RolePermissionsEditor'
import { UserRoleAssignment } from '@/app/components/administracion/UserRoleAssignment'
import { permissionText, roleName } from '@/app/lib/access-messages'
import { adminSections, getAdminSection } from '@/app/lib/admin-sections'
import { requirePermission } from '@/app/lib/auth/authorization'
import { PERMISSION_DENIED } from '@/app/lib/auth/permissions'
import { requireUser } from '@/app/lib/auth/session'
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

  // Permisos is translated (LASCE-SEC-008); the other sections still show Spanish.
  if (section === 'permisos') {
    const t = await getTranslations('administration.permissions')
    return { title: t('metaTitle'), description: t('description') }
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

  // Every section needs a session, so login returns the visitor to this exact section.
  await requireUser(`/administracion/${section}`)

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
    const [{ allowed }, messages, t] = await Promise.all([
      requirePermission('manage_permissions', '/administracion/permisos'),
      getMessages(),
      getTranslations('administration.permissions'),
    ])
    if (!allowed) {
      return (
        <AccessDenied
          message={permissionText('manage_permissions', messages).denied}
          title={messages.access.accessDenied.title}
        />
      )
    }
    const matrix = await getPermissionMatrix()
    // Roles keep their identifiers; only the names shown follow the site's language.
    const roles = availableRoles().map((role) => ({
      ...role,
      name: roleName(role.id as UserRole, messages),
    }))
    return (
      <RolePermissionsEditor
        title={t('title')}
        description={t('description')}
        roles={roles}
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
