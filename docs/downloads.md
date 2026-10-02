# Downloads from `/datos`

A signed-in user can download what `/datos` shows: the chart as a **PNG**, and for some
instruments the data as a **CSV**. Each attempt is validated, then the file is generated on request,
stored in a private MinIO bucket, handed back as a **30-minute presigned link**, and recorded in
`public.resource_downloads`.

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
  downloaded unless they sign in and choose the download again, so every row in the audit table
  names a user.
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

## How a download is produced

Once access is granted, `createResourceDownload` (`app/services/downloads/downloadService.ts`)
produces the file:

```
validateResourceDownload → granted
  1. DOWNLOAD_LOADERS → the data (may answer `pending`, or be `empty`)
  2. EXPORTERS[format] → bytes
  3. storeDownload → private bucket + presigned link
  4. prisma.resourceDownload.create
  ▼
{ ok: true, url, filename, expiresAt }
```

The link is returned only after the row is written. If the upload or the insert fails, the user
gets an error and no link, so every link that was ever handed out is in the table. Validation runs
again on every attempt, so retrying a failed download never skips a permission check.

### Where the data comes from (`loaders.ts`)

- **PNG** uses the same result the page shows (`scientificDataSources.query`). For EXIS that
  result is sampled to 360 points. For MAG and SEISS it is the worker's `query-goes-archive` job:
  the page passes along the `jobId` that answered its query, so the download reuses the finished
  job instead of queueing a new one. While a job is still running, the action answers `pending`.
- **EXIS CSV** reads InfluxDB **without sampling** (`queryExisReadingsFull`), keeping only the
  latest satellite in the window, as the chart does. A full SFXR day is about 86 000 rows, around
  3 MB.
- **ROSAC CSV** uses the simulated result, which is already complete.

### Exporters (`exporters/`)

- **`csv.ts`** follows RFC 4180: CRLF line endings, a UTF-8 BOM, and `#` metadata lines first
  (source, instrument, product, channel, unit, satellite, UTC range, provider, notice, generation
  time). Columns are `timestamp_utc,value`, or `timestamp_utc,frequency_mhz,value` for a spectrum.
- **`png.ts`** builds a standalone SVG from the layouts in `app/lib/charts/`, then rasterizes it at
  2× with `@resvg/resvg-js`. The on-screen `ScientificDataChart` and `DynamicSpectrumChart` use the
  same layouts, so the image matches the screen. Its header and footer carry the source,
  instrument, channel, date, UTC range and provider.
  - The page's SVG is styled through CSS variables that a standalone file does not have, so
    `png.ts` carries those colours resolved.
  - The font is the bundled `app/services/downloads/fonts/Geist-Regular.ttf`, because the
    container image has no system fonts. `next.config.ts` traces it into the standalone output.

## Storage

- The bucket is `MINIO_DOWNLOADS_BUCKET` (default `lasce-downloads`). It is a separate bucket on
  purpose: `MinioAssetStorage.ensureBucket()` (in `app/services/storage`, used by the CMS uploads)
  grants anonymous read on its whole bucket, which would make the 30-minute expiry meaningless.
- `downloadStorage.ts` never sets a bucket policy. On first use in each process it creates the
  bucket and a lifecycle rule that deletes objects after **1 day**.
- Object keys are `<source>/<instrument>/<yyyy-mm-dd>/<uuid>.<ext>`, so a link cannot be guessed,
  and it stops working after 30 minutes.
- The link sets `response-content-disposition`, so the browser saves the file under a readable
  name, for example `GOES_EXIS_SFXR_0.1-0.8nm_2026-09-30_0000-2359.csv`.

**Known gap.** The link is signed against `MINIO_ENDPOINT`, so that host must be reachable from
the browser. It is in local development (`localhost:9000`), but not inside Docker Compose
(`minio:9000`). This is gap 7 in [manage-assets.md](manage-assets.md#known-gaps); a
`MINIO_PUBLIC_ENDPOINT` would close it for both features.

## The audit table

`public.resource_downloads` ([database-definition.md](database-definition.md)) stores, per
download:

- `user_id`, set to null if the account is deleted, so the row survives;
- `source`, `instrument`, `product`, `format`;
- the query `params` (`parameter`, `date`, `startTime`, `endTime`);
- `object_key`, `byte_size`, `row_count` (null for images) and the link's `expires_at`.

The object expires after a day. The row stays.

## Adding an instrument or a format

**An instrument** (say MAG data):

1. Add a reader that returns a `ScientificDataResult`. For MAG and SEISS, this means a
   full-resolution path through the worker first, because `query-goes-archive` samples to 360
   points.
2. Add its formats to `DOWNLOAD_POLICIES` (`app/lib/downloads/policy.ts`).
3. Add the loader to `DOWNLOAD_LOADERS` (`app/services/downloads/loaders.ts`).
   `loaders.test.ts` fails while a policy entry has no loader.
4. Add a row to `policy.test.ts`, and update the table at the top of this file and the banner in
   `ScientificDataExplorer.tsx`.

**A format** (say `json`):

1. Add it to `DOWNLOAD_FORMATS` and `DOWNLOAD_FORMAT_DEFINITIONS` (`app/lib/downloads/formats.ts`).
   Its `kind` decides whether anonymous visitors are offered it as a sign-in prompt (`graphic`) or
   never see it (`data`).
2. Write `exporters/json.ts`, implementing `Exporter`, and register it in `exporters/index.ts`.
   `EXPORTERS` is a full `Record`, so the typecheck fails until you do.
3. Allow it per instrument in `DOWNLOAD_POLICIES` and give it loaders.

Neither change needs a migration: `format`, `source` and `instrument` are plain strings in the
table, like `RolePermission.permission`.

## Tests

| What                 | Where                                                                 |
| -------------------- | --------------------------------------------------------------------- |
| Policy table         | `apps/web/app/lib/downloads/policy.test.ts`                           |
| Access validation    | `apps/web/tests/unit/services/downloads/downloadAccess.test.ts`       |
| Chart layouts        | `apps/web/app/lib/charts/charts.test.ts`                              |
| Exporters, storage   | `apps/web/tests/unit/services/downloads/`                             |
| Server Action        | `apps/web/app/(public)/datos/actions.test.ts`                         |
| Buttons and explorer | `ResourceDownloadActions.test.tsx`, `ScientificDataExplorer.test.tsx` |
| End to end (gating)  | `apps/web/tests/e2e/scientific-data.spec.ts`, `describe('downloads')` |

CI's e2e job has no MinIO, so the Playwright suite checks who gets which button and the sign-in
redirect, not the file itself. The unit tests cover generation; check a real download locally
against `pnpm services:up`.
