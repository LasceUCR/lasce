# User overview and role assignment (#79 / #80)

`/administracion/usuarios` reads `auth.users` through Prisma. It selects only profile
fields and the assigned role; credentials and session tokens never reach the table.
Available columns come from Prisma's `UserRole` enum, using the existing Spanish labels.
The existing dialogs and search remain presentational. Mocks are used only in stories/tests.

One role can be assigned at a time. Removing it stores NULL, displayed as no checked
column and "Sin rol asignado" in the account page. New public registrations still
default to VISITOR. The nullable migration is mirrored in the Python model.

The page requires a session and the `manage_users` permission; the write action independently
repeats that check. A visitor or assistant without that grant sees "Acceso denegado" and cannot
change assignments. The role is read from the database each request, so a revoked grant cannot
keep editing through an existing session. Self-removal is allowed; access is lost on refresh.

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
