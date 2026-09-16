# Wiring permissions into a page

Roles stay `VISITOR`, `ASSISTANT` and `ADMIN`. Pages and actions never branch on
`role === 'ADMIN'`. They ask whether the current account holds a named grant from
[`permissions.ts`](../apps/web/app/lib/auth/permissions.ts). Administrators can change who has
which grant on `/administracion/permisos`; the catalogue and the checks below stay the same.

What those grants mean, the defaults, and the matrix table live in
[`role-permissions.md`](role-permissions.md). This note is how to put them in code.

The helpers are in `apps/web/app/lib/auth/authorization.ts`:

| Helper                                  | Use it when                                                                                                                  |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `requirePermission(name, returnTo)`     | The whole page is the work. Anonymous visitors go to `/acceso`. Signed-in accounts without the grant see Acceso denegado.    |
| `requireAnyPermission(names, returnTo)` | Several grants can unlock the same screen (create _or_ edit _or_ delete). The `granted` list is what you pass down as props. |
| `userHasPermission(name)`               | The page is public and tools are optional. No redirect. Missing grant means `false`.                                         |

Do not call any of these from the shared `(public)` layout. Call them in the page (or the Server
Action) that needs the answer.

## 1. Decide which grant is the work

Reuse the existing names when they already match:

| Grant                | Typical UI                     |
| -------------------- | ------------------------------ |
| `edit_components`    | Pencil, inline editor, Guardar |
| `delete_components`  | Trash                          |
| `create_components`  | Añadir / Crear                 |
| `download_resources` | `/administracion/descargas`    |
| `manage_users`       | `/administracion/usuarios`     |
| `manage_permissions` | `/administracion/permisos`     |

Assistant defaults include `edit_components` only. Admin defaults include create, edit and
delete. A visitor has none of those three, so they see the public page with no tools.

If the work is something else (news-only, a new resource type), add a new identifier to the
catalogue first — see [Adding a grant](#adding-a-grant).

## 2. Read the grant on the page, not in the component

The page is a Server Component. It looks up permissions and passes booleans (or the `granted`
list) as props. The UI component stays presentational: no `userHasPermission`, no `@lasce/db`,
no Server Actions inside it.

### Public page, optional tools

A public article can stay readable for everyone. Look up the grants on the **page**, pass
booleans as props, and let the presentational component hide the pencil or trash.

```tsx
import { userHasPermission } from '@/app/lib/auth/authorization'

export const dynamic = 'force-dynamic'

export default async function ArticlePage() {
  const canEdit = await userHasPermission('edit_components')
  const canDelete = await userHasPermission('delete_components')
  return <ArticleBlock canEdit={canEdit} canDelete={canDelete} />
}
```

`userHasPermission` does not redirect. A visitor gets `false` and the page looks as it always
did. The component only reads the props:

```tsx
{
  canEdit ? (
    <button type="button" aria-label="Editar">
      …
    </button>
  ) : null
}
{
  canDelete ? (
    <button type="button" aria-label="Eliminar">
      …
    </button>
  ) : null
}
```

`/nosotros` is the live case: the route looks up `create_components`, `edit_components` and
`delete_components`, and `NosotrosPage` only shows Añadir / pencil / trash when Modo edición
is on **and** the matching grant is true. The POST / PATCH / DELETE handlers call
`requireApiPermission` with the same names — hiding the button is not enough.

### Admin page that must not be public

Downloads, users and permissions require a session and a specific grant. Anonymous visitors are
sent to `/acceso`. Signed-in accounts without the grant see Acceso denegado.

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

### One screen, several verbs

News (or any future editor) that an assistant may only edit, while an administrator may also
create and delete:

```tsx
const { allowed, granted } = await requireAnyPermission(
  ['create_components', 'edit_components', 'delete_components'],
  '/administracion/noticias',
)
if (!allowed) return <AccessDenied message="No tienes autorización para gestionar noticias." />

return (
  <NewsEditor
    canCreate={granted.includes('create_components')}
    canEdit={granted.includes('edit_components')}
    canDelete={granted.includes('delete_components')}
  />
)
```

The assistant still enters the page (`edit_components` is enough for `allowed`). Create and
delete stay hidden because those flags are false.

## 3. Check again on every write

Hiding the trash is not authorization. Each Server Action asks for the grant that matches the
verb. JSON route handlers use `requireApiPermission` from `apiGuard.ts` instead — it returns
401/403 JSON rather than a redirect, which `fetch` can read.

```tsx
'use server'

import { userHasPermission } from '@/app/lib/auth/authorization'

export async function updateContribution(input: unknown) {
  if (!(await userHasPermission('edit_components'))) return { ok: false }
  // persist...
}

export async function deleteContribution() {
  if (!(await userHasPermission('delete_components'))) return { ok: false }
  // persist...
}
```

`updateRolePermissions` and `saveUserRole` already follow this: the UI can lie, the action
cannot.

## 4. What not to do

- Do not read `user.role` to decide create / edit / delete. The matrix on `/administracion/permisos`
  would then be ignored.
- Do not put `requirePermission` on the public layout. A missing grant would lock the whole
  site, not one page.
- Do not treat a missing sidebar link or a missing pencil as the only check.

## Adding a grant

Only when the existing names are the wrong work:

1. Add the identifier and its Spanish strings (`PERMISSION_LABELS`, `PERMISSION_DENIED`) in
   `apps/web/app/lib/auth/permissions.ts`.
2. Give it to the roles that should have it in `DEFAULT_ROLE_PERMISSIONS` **and** a new Prisma
   migration that inserts the rows. Existing databases do not pick up TypeScript defaults.
3. Call `requirePermission` / `userHasPermission` from the page and from any Server Action that
   performs the work.

The Permisos table will show the new row once the catalogue and the migration agree.
