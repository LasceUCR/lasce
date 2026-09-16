# Role permissions (LASCE-SEC-008-073)

Administrators configure what each existing role may do. The roles themselves stay the
`UserRole` enum (`visitor`, `assistant`, `admin`); this document is the mapping from those
roles to a catalogue of permissions, and the checks that read it.

Component create/edit/delete will gate portal components when those editors exist.
Laboratory **resources** are a separate concern: downloading them (`download_resources`).

## Defaults

| Role          | Permissions                                                                                                             |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Visitante     | `download_resources`                                                                                                    |
| Asistente     | `edit_components`, `download_resources`                                                                                 |
| Administrador | `create_components`, `edit_components`, `delete_components`, `download_resources`, `manage_users`, `manage_permissions` |

The component-management grants are in the catalogue so later editors can call
`requirePermission` without a new role model. There is no Componentes screen yet.

`manage_permissions` cannot be removed from `ADMIN`. That is the only locked grant: it is what
keeps the matrix itself configurable.

## The pieces

| Piece                                         | File                                                                          |
| --------------------------------------------- | ----------------------------------------------------------------------------- |
| Permission catalogue and Spanish copy         | `apps/web/app/lib/auth/permissions.ts`                                        |
| Session-aware checks (`requirePermission`, …) | `apps/web/app/lib/auth/authorization.ts`                                      |
| Matrix read/write                             | `apps/web/app/lib/role-permissions.ts`                                        |
| Save action                                   | `apps/web/app/(public)/administracion/permission-actions.ts`                  |
| Management UI                                 | `apps/web/app/components/administracion/RolePermissions{Page,Editor}.tsx`     |
| Access-denied copy                            | `apps/web/app/components/administracion/AccessDenied.tsx`                     |
| Resource downloads                            | `/administracion/descargas` (`download_resources`)                            |
| Table                                         | `auth.role_permissions`, see [database-definition.md](database-definition.md) |

Hiding a sidebar link is not an authorization check. Every write action repeats the permission
lookup, and the role is read from the database each request (same as user administration). The
public header's Administración tab is shown only to `ASSISTANT` and `ADMIN`, from the account
cookie; that is also not an authorization check.

## Protecting a page

```tsx
import { AccessDenied } from '@/app/components/administracion/AccessDenied'
import { requirePermission } from '@/app/lib/auth/authorization'
import { PERMISSION_DENIED } from '@/app/lib/auth/permissions'

export const dynamic = 'force-dynamic'

export default async function DescargasPage() {
  const { allowed } = await requirePermission('download_resources', '/administracion/descargas')
  if (!allowed) return <AccessDenied message={PERMISSION_DENIED.download_resources} />
  // ...
}
```

Anonymous visitors are redirected to `/acceso` by `requireUser`. A signed-in account without the
grant sees "Acceso denegado" and the Server Action still refuses the write.

`requireAnyPermission` is for a hub that several grants can unlock.
Downloads use `requirePermission('download_resources')` on `/administracion/descargas`.

Do not call these helpers from the shared `(public)` layout.

## Changing the catalogue

1. Add the identifier to `PERMISSIONS` and its Spanish strings in `permissions.ts`.
2. Give it to the roles that should have it by default, in `DEFAULT_ROLE_PERMISSIONS` **and** a
   new Prisma migration that inserts the rows (existing databases will not pick up TypeScript
   defaults).
3. Call `requirePermission` from the page and from any Server Action that performs the work.

Login, sessions and unrelated admin screens stay untouched.

## Audit

There is no audit log yet. When one exists, `updateRolePermissions` is the write to record:
role, previous set, new set, and the actor's user id.
