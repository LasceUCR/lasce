# Downloads from `/datos`

A signed-in user can download what `/datos` shows: the chart as a **PNG**, and for some
instruments the data as a **CSV**. This page covers who may download what, and how every attempt
is validated. Producing and transferring the file is tracked in #82.

## Who may download what

| Source / instrument | Chart (PNG)          | Data (CSV)                                       |
| ------------------- | -------------------- | ------------------------------------------------ |
| GOES / EXIS         | `download_resources` | `download_resources` + `download_goes_resources` |
| GOES / MAG, SEISS   | `download_resources` | not offered yet (needs a full-resolution path)   |
| GOES / SUVI         | not offered          | not offered                                      |
| ROSAC / any         | `download_resources` | `download_resources`                             |

- The buttons are primary buttons under each charted result. A signed-in user sees only the
  formats they may download; anything else is hidden, not disabled.
- Anonymous visitors see each **graphic** format (`kind: 'graphic'` in `formats.ts`) as a
  **Inicie sesión para descargar la gráfica** button with a sign-in icon. It sends them to
  `/acceso?next=%2Fdatos&reason=auth`. **Data** formats are not shown to them at all. Nothing is
  downloaded unless they sign in and choose the download again.
- `download_resources` is held by every role by default, so in practice "signed in" is enough for
  charts and ROSAC data. An administrator can revoke it per role at `/administracion/permisos`.
- `download_goes_resources` is held by administrators only by default
  ([role-permissions.md](role-permissions.md)).
- SUVI is excluded by design. It has no entry in the policy, and the policy denies by default.

The table above is `DOWNLOAD_POLICIES` in `apps/web/app/lib/downloads/policy.ts`. The page reads it
to draw the buttons, and the server reads it to enforce them, so the two cannot disagree. Hiding a
button is only a hint.

## How an attempt is validated

```
ScientificDataExplorer ── requestResourceDownload (Server Action, app/(public)/datos/actions.ts)
                              1. getSessionUser()       → none: `unauthenticated`
                              2. getPermissionsForRole  → the role's grants, read on this request
                              3. validateResourceDownload (app/services/downloads/downloadAccess.ts)
                                   invalid      the query or format does not parse, or a future GOES date
                                   unsupported  the product offers no such format (SUVI, MAG CSV, …)
                                   forbidden    a required grant is missing; the message names it
```

- An expired session is the same as no session: `getSessionUser()` returns `null`, so the user
  is asked to sign in again.
- Grants are read from `auth.role_permissions` on every attempt, never cached in the session, so
  a permission revoked a moment ago is already refused.
- "Not signed in" and "not permitted" are told apart: the first sends the user to `/acceso`, the
  second shows the denial message from `PERMISSION_DENIED`, for example _No tienes autorización
  para descargar recursos GOES._

## Adding an instrument or a format

**An instrument:** add its formats to `DOWNLOAD_POLICIES` and a row to `policy.test.ts`. Then
update the table at the top of this file and the banner in `ScientificDataExplorer.tsx`.

**A format** (say `json`): add it to `DOWNLOAD_FORMATS` and `DOWNLOAD_FORMAT_DEFINITIONS`
(`app/lib/downloads/formats.ts`). Its `kind` decides whether anonymous visitors are offered it as a
sign-in prompt (`graphic`) or never see it (`data`). Then allow it per instrument in
`DOWNLOAD_POLICIES`.

## Tests

| What                 | Where                                                                 |
| -------------------- | --------------------------------------------------------------------- |
| Policy table         | `apps/web/app/lib/downloads/policy.test.ts`                           |
| Access validation    | `apps/web/tests/unit/services/downloads/downloadAccess.test.ts`       |
| Server Action        | `apps/web/app/(public)/datos/actions.test.ts`                         |
| Buttons and explorer | `ResourceDownloadActions.test.tsx`, `ScientificDataExplorer.test.tsx` |
| End to end           | `apps/web/tests/e2e/scientific-data.spec.ts`, `describe('downloads')` |
