# User and role overview — implementation status

The `/administracion/usuarios` view implements the consultation UI for PBI #79.
It is a prototype using fictional users and assignments, explicitly labelled on screen.
The agreed role labels are Visitante, Asistente and Administrador. They are fixtures,
not a persisted role catalogue or a permissions policy.

## Supported behaviour

- Display user names, emails and one column per supplied role, using stable role IDs.
- Display users without assigned roles, with every indicator unchecked.
- Display assignments using disabled checkboxes; this view cannot change assignments.
- Search locally by partial name or email while typing, ignoring case and leading/trailing
  whitespace. Accents are significant. Empty or whitespace-only queries show all supplied users.
- Retain the matching users' assignments; explain no matches and allow changing or clearing search.
- Display empty-user and empty-role states. An empty role catalogue does not hide users.
- Keep the table horizontally scrollable and keyboard-focusable on narrow screens.
- Open a read-only profile dialog from a user's name, showing full name, email, institution
  and country. This detail view was explicitly requested as an addition to the original PBI.
  Passwords are excluded from the view model and must never be supplied by the backend.
  Missing institution/country values are labelled explicitly. Closing with the button or Escape
  restores focus to the name and preserves the search.

`UsersOverviewPage` receives `users` and `roles` through props. It does not query a database,
call a Server Action, or import runtime services. The route currently supplies
`app/lib/user-overview-demo.ts`. Storybook and unit tests reuse these fixtures.

`UsersOverviewPage` owns search and empty-state messages. `UsersRolesTable` owns the
read-only table, role indicators and horizontal scrolling, with a dedicated CSS module.
Shared data types live in `app/lib/user-overview.ts`. The table receives filtered users
and roles through props and imports no fixtures or backend services. Its accessible name
also works when rendered independently in Storybook.

## Stage status and real-data handoff

Stage 4 covers component and browser checks for the implemented UI. Stage 5 (real-data
integration) and the authorization portion of stage 6 remain pending.

The inspected Prisma schema has research models only. No user/role provider, session
integration or user-administration authorization boundary is present in this branch.
Do not replace missing dependencies with a new account system or expose actual user records
through this currently public route.

To connect the agreed source when available:

1. Identify the authoritative users, roles and user-role assignments and their stable IDs.
2. Integrate the existing session and server-side consultation permission before reading
   private records. Hiding navigation is not an authorization check.
3. Implement the backend read operation within this PBI and map its result to
   `{ users: [{ id, name, email, institution, country, roleIds }], roles: [{ id, name }] }`.
   `name` contains the full name. Select these profile fields explicitly; never return passwords
   or password hashes to the client.
4. Replace the fixture import at the route boundary and omit `isDemo` for real data.
   The current search covers all supplied users; a paginated source must implement search
   over the entire accessible collection, not just the current page.
5. Verify missing assignments, dynamic role configuration, real search results and denied
   requests using the integrated services. Treat provider errors as failures, never as an
   empty assignment list.

No role creation, permission configuration or assignment editing is part of this change.
The PBI cannot be marked fully complete while real-data and access-denial criteria are pending.

## Verification

- `UsersRolesTable.test.tsx`: assignments, custom roles and users without roles.
- `UserDetailsDialog.test.tsx`: selected profile, missing fields, closing, focus restoration,
  preserved search and exclusion of additional sensitive fields.
- `UsersOverviewPage.test.tsx`: empty states,
  name/email search, clearing, whitespace and updated input data.
- `users-overview.spec.ts`: direct access to the mock view, live search, Enter handling,
  non-editable assignments, no matches, keyboard clearing, table scrolling, layout overflow
  and automated accessibility at 390 and 1440 CSS pixels in Chromium.
- `administracion.spec.ts`: navigation from the existing administration shell.

Run `pnpm --filter @lasce/web test` and
`pnpm --filter @lasce/web exec playwright test tests/e2e/administracion.spec.ts tests/e2e/users-overview.spec.ts`.
These browser checks validate the mock UI; they do not validate authentication or real data.

### Local validation — 2026-09-12

- Turbo lint, typecheck and test excluding the unchanged Python worker: 16 tasks successful.
- Web unit suite: 180 tests passed across 40 files, including 8 overview tests; coverage thresholds passed.
- Web production build: compilation, typechecking and static generation succeeded; Turbo reported 2 successful tasks.
- Targeted Chromium suite: all 6 cases reported passed, including the two overview cases with axe checks.
  The runner remained active after its final case and was interrupted, so a clean command exit
  is not claimed for that run.
- Python, Docker image builds and the complete browser regression suite were not run for this change.
