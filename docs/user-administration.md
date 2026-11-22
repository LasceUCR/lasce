# User overview and role assignment (#79 / #80)

`/administracion/usuarios` reads `auth.users` through Prisma. It selects only profile
fields and the assigned role; credentials and session tokens never reach the table.
Available columns come from Prisma's `UserRole` enum; their names come from the catalogue (see
[Languages](#languages)).
The existing dialogs and search remain presentational. Mocks are used only in stories/tests.

One role can be assigned at a time. Each row is one native radio group (#505): a radio per role
plus "Sin rol", sharing a `name`, so only one option can ever be selected and the arrow keys move
between them. Each radio is labelled "<rol>: <nombre> (<correo>)". Choosing a different option
opens the confirmation dialog; the selection stays on the saved role until the change is
confirmed, and cancelling leaves it untouched. Choosing "Sin rol" stores NULL, shown as "Sin rol
asignado" in the account page. The text under the help explains what that means, and the "Sin
rol" radios reference it with `aria-describedby`: an account without a role can sign in and view
the public pages, but holds no permission (`getPermissionsForRole(null)` is empty), so it cannot
download resources or enter the administration area. New public registrations still default to
VISITOR. The nullable migration is mirrored in the Python model.

The page requires a session and the `manage_users` permission; the write action independently
repeats that check. A visitor or assistant without that grant sees "Acceso denegado" and cannot
change assignments. The role is read from the database each request, so a revoked grant cannot
keep editing through an existing session.

## At least one administrator

The platform always keeps at least one account with the `ADMIN` role. `updateUserRole` refuses a
change that takes the role away from the only administrator, whoever makes it, and answers
`{ ok: false, reason: 'lastAdministrator' }` with the role unchanged and no audit event. The page
shows `errors.lastAdministrator` as an error toast inside the dialog, which stays open; no reload
is needed, because nothing changed.

An administrator **may** change or remove their own role, but only while another administrator
exists. The dialog warns them ("Estás modificando tu propio rol…") and the server enforces the
rule; access is lost on refresh. The same rule applies to demoting another administrator.

Inside the role-change transaction, a demotion first locks every administrator row
(`SELECT id FROM auth.users WHERE role = 'admin' ORDER BY id FOR UPDATE`) before counting them. Two
administrators demoting each other at the same time therefore cannot both succeed: the second
waits for the first to commit, then no longer counts the first one's target. Granting the role, or
a change between other roles, takes no lock.

Confirmed changes use a compare-and-set update with the previously displayed role.
A stale row, invalid role, unauthorized request or database failure does not report
success. Conflicts and lost authorization have distinct messages. An unconfirmed
save asks the administrator to reload and check the actual role, rather than claiming
the database is unchanged. The error receives focus and a reload button is provided;
confirmation stays disabled until fresh data is loaded. There is no optimistic success state.

Changing one's own role includes an access-loss warning. Search announces matching
counts, and clearing it restores focus to the input. Dialogs wrap long names and stack
actions on narrow screens; the data table scrolls within its keyboard-focusable region.
Browser checks cover 320, 390, 640 and 1440px widths, including a short landscape viewport.

Apply committed migrations with `pnpm db:migrate:deploy`, generate with `pnpm db:generate`,
and restart the web process. Do not reset a shared development database when switching branches.

## Optional local test accounts

From the repository root, with `pnpm services:up` and `pnpm db:migrate` already run:

```bash
pnpm accounts:create
```

It runs `packages/db/prisma/seed-user-administration.ts`. This opt-in script rejects non-local
database hosts and creates four new uniquely named accounts, one per role (ADMIN, ASSISTANT,
VISITOR, unassigned), sharing one random password. It prints the addresses and the password
once, for example:

```json
{
  "users": [
    { "email": "qa-visitor-1a2b3c4d@example.com", "role": "VISITOR" },
    { "email": "qa-assistant-1a2b3c4d@example.com", "role": "ASSISTANT" },
    { "email": "qa-admin-1a2b3c4d@example.com", "role": "ADMIN" },
    { "email": "qa-none-1a2b3c4d@example.com", "role": null }
  ],
  "password": "<random>"
}
```

Sign in at `http://localhost:3000/acceso` with any of them. Run it again whenever you need a fresh
set; it neither clears tables nor changes existing accounts. Do not commit its credential output.

The ordinary seed (`pnpm db:seed`) creates no account you can sign in with. Its
`contenido@lasce.cinespa.ucr.ac.cr` user only credits the seeded content as `modifiedBy`; its
password hash can never match. End-to-end fixtures remove only their own UUIDs afterwards.

## Languages

`/administracion/usuarios` is shown in Spanish or English, following the site's language
(LASCE-ADM-001-379), like [Permisos](role-permissions.md#languages). Role identifiers stay the
stable `UserRole` values everywhere that matters: the table's radio buttons, the save action, the
compare-and-set update and authorization use `VISITOR`, `ASSISTANT` and `ADMIN`. Only the text is
translated, and it is never stored. Changing the language re-renders the same route and saves
nothing.

| Text                                                | Catalogue keys                                                         |
| --------------------------------------------------- | ---------------------------------------------------------------------- |
| Role names                                          | `access.roles.<UserRole>` (`roleName`)                                 |
| "Acceso denegado" and the `manage_users` denial     | `access.accessDenied.title`, `access.permissions.manage_users.denied`  |
| Title, table, search, announcements, details dialog | `administration.users.*`                                               |
| Role-change dialog (assign, remove, self-removal)   | `administration.users.dialog.*`                                        |
| "Sin rol" column and its explanation                | `administration.users.table.noRole`, `administration.users.noRoleHelp` |
| Conflict, lost authorization, last administrator    | `administration.users.errors.*`                                        |

- The page (`(public)/administracion/[section]/page.tsx`) maps the role names and the denial text
  on the server, and passes `getUserOverview(locale)` so the country in the details dialog is named
  in the site's language. Names and e-mail addresses are user data and are never translated.
- The result count uses ICU plurals (`administration.users.results`), so the announcement follows
  each language's plural rules. A key missing from English falls back to Spanish.
- The outcome of a role change is a toast: success ("Rol actualizado para ...") once the dialog has
  closed, and failures from the dialog, which stays open with the selection preserved. A failure
  always has a translated reason (`errors.conflict`, `errors.unauthorized`,
  `errors.lastAdministrator`) or the translated fallback (`errors.unknown`), never the server's raw
  message. The save is a Server Action rather than a route handler, so the row reports it with
  `useToast()` directly; the reason comes from the action's result, as `docs/toasts.md` describes.
- The audit summary of a role change is stored in Spanish when it happens and translated when it
  is read ([audit-log.md](audit-log.md)); it is not part of this page.
- The demonstration data in `lib/user-overview-demo.ts` (stories only) stays in Spanish.
