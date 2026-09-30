import type { Permission } from './auth/permissions'

/**
 * Catalogue of the administration sections (LASCE-ADM-002-148). The menu in
 * `AdminShell` and the route at `(public)/administracion/[section]` read the
 * same entries, so a section's title, path and required grant are declared
 * once. Pure data: this module reaches the client bundle, so it imports
 * nothing from `@lasce/db` or Prisma.
 */
export interface AdminSection {
  slug: string
  title: string
  description: string
  /** Grant the section page requires. Absent means the section is public. */
  permission?: Permission
}

/** In sidebar order. `[section]/page.tsx` enforces `permission`; the menu only reads it. */
export const adminSections = [
  {
    slug: 'descargas',
    title: 'Descargas',
    description: 'Historial y control de descargas de datos del laboratorio.',
    permission: 'download_resources',
  },
  {
    slug: 'usuarios',
    title: 'Usuarios',
    description: 'Consulta los usuarios registrados y sus roles actuales.',
    permission: 'manage_users',
  },
  {
    slug: 'permisos',
    title: 'Permisos',
    description: 'Configura los permisos asociados a cada rol del sistema.',
    permission: 'manage_permissions',
  },
  {
    slug: 'infraestructura',
    title: 'Infraestructura',
    description: 'Estado de los servicios, procesos e instrumentos del laboratorio.',
  },
] as const satisfies readonly AdminSection[]

export type AdminSectionSlug = (typeof adminSections)[number]['slug']

export const ADMIN_ROOT = '/administracion'

export function adminSectionPath(slug: AdminSectionSlug): string {
  return `${ADMIN_ROOT}/${slug}`
}

/** The section behind a `[section]` segment, or `null` when there is none. */
export function getAdminSection(slug: string): AdminSection | null {
  return adminSections.find((section) => section.slug === slug) ?? null
}

export type AdminMenuKey = 'resumen' | AdminSectionSlug

export interface AdminMenuItem {
  key: AdminMenuKey
  label: string
  href: string
  /** Grant that unlocks the entry. Absent means everyone sees it. */
  permission?: Permission
}

/** Resumen is `/administracion` itself, not a `[section]` route, so it is not in `adminSections`. */
export const adminMenu: readonly AdminMenuItem[] = [
  { key: 'resumen', label: 'Resumen', href: ADMIN_ROOT },
  ...adminSections.map((section): AdminMenuItem => ({
    key: section.slug,
    label: section.title,
    href: adminSectionPath(section.slug),
    ...('permission' in section ? { permission: section.permission } : {}),
  })),
]

/**
 * The entries an account may see: those without a grant, plus those whose
 * grant is held. Hiding a link is not an authorization check; every section
 * page still calls `requirePermission`.
 */
export function visibleAdminMenu(granted: readonly Permission[]): AdminMenuItem[] {
  return adminMenu.filter((item) => !item.permission || granted.includes(item.permission))
}

/**
 * Whether `href` is the current administration page. Resumen matches only
 * itself; a section also matches its own subpaths.
 */
export function isAdminItemActive(href: string, pathname: string): boolean {
  if (href === ADMIN_ROOT) return pathname === ADMIN_ROOT
  return pathname === href || pathname.startsWith(`${href}/`)
}
