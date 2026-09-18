# Database definition

Every table currently defined in `packages/db/prisma/schema.prisma` — the single source of truth
for PostgreSQL (see [`architecture.md`](architecture.md#who-owns-what)). Prisma is the only
migration source; the worker mirrors these tables in SQLAlchemy
(`apps/worker/app/db/models.py`) to read and write them, but never migrates them.

## Schemas

| Postgres schema | Used for                                               | Populated today |
| --------------- | ------------------------------------------------------ | --------------- |
| `public`        | Default, for anything not domain-specific              | No tables yet   |
| `research`      | Public research/publications shown on `/investigacion` | Yes             |
| `news`          | Public news/media coverage shown on `/noticias`        | Yes             |
| `auth`          | Portal accounts created through `/acceso`              | Yes             |
| `solar`         | SUVI L1b frames catalogued by the worker's SUVI pipeline | Yes             |

Multi-schema support is enabled via Prisma's `schemas` datasource setting (GA as of the Prisma
version this repo pins — no `previewFeatures` flag needed). Every model in `research` is tagged
`@@schema("research")`, every model in `news` is tagged `@@schema("news")`, every model in `auth`
is tagged `@@schema("auth")`, and every model in `solar` is tagged `@@schema("solar")`; a future
domain unrelated to these should get its own schema the same way rather than being added to one
of them.

## `research` schema

### `publishers`

A journal, conference, or institutional outlet a research record was published through — the
"venue" shown on the public research page.

| Column       | Prisma type | Postgres type    | Constraints                            |
| ------------ | ----------- | ---------------- | -------------------------------------- |
| `id`         | `String`    | `uuid`           | PK, `gen_random_uuid()`                |
| `name`       | `String`    | `text`           | `UNIQUE`, not null                     |
| `created_at` | `DateTime`  | `timestamptz(3)` | not null, default `now()`              |
| `updated_at` | `DateTime`  | `timestamptz(3)` | not null, default `now()`, app-managed |

Relationships: has many `research_records`.

### `research_records`

A public research record shown on `/investigacion`: a paper, article, or institutional note,
linked to its original source rather than a hosted copy. The Prisma model is `Research`
(`prisma.research.*`); the table itself is named `research_records`, not `research`, to avoid the
`research.research` stutter under the `research` Postgres schema.

| Column             | Prisma type | Postgres type    | Constraints                                          |
| ------------------ | ----------- | ---------------- | ---------------------------------------------------- |
| `id`               | `String`    | `uuid`           | PK, `gen_random_uuid()`                              |
| `title`            | `String`    | `text`           | not null                                             |
| `publication_date` | `DateTime`  | `date`           | not null; indexed for the public page's sort         |
| `publisher_id`     | `String`    | `uuid`           | FK → `publishers.id`, `ON DELETE RESTRICT`, not null |
| `abstract`         | `String`    | `text`           | not null                                             |
| `external_url`     | `String`    | `text`           | `UNIQUE`, not null — link to the original source     |
| `doi`              | `String?`   | `text`           | `UNIQUE`, nullable — not every record has one        |
| `created_at`       | `DateTime`  | `timestamptz(3)` | not null, default `now()`                            |
| `updated_at`       | `DateTime`  | `timestamptz(3)` | not null, default `now()`, app-managed               |

Relationships: belongs to one `publishers` row; has many `research_cross_authors` (its authors,
through the join table below).

### `research_authors`

A person credited as an author on one or more research records.

| Column       | Prisma type | Postgres type    | Constraints                            |
| ------------ | ----------- | ---------------- | -------------------------------------- |
| `id`         | `String`    | `uuid`           | PK, `gen_random_uuid()`                |
| `name`       | `String`    | `text`           | `UNIQUE`, not null — see note below    |
| `created_at` | `DateTime`  | `timestamptz(3)` | not null, default `now()`              |
| `updated_at` | `DateTime`  | `timestamptz(3)` | not null, default `now()`, app-managed |

> `name` is unique so the same person is reused across records instead of duplicated. Two
> distinct people who happen to share a citation form (e.g. two "J. García"s) would collide under
> this — acceptable at today's scale, worth revisiting (an external id, ORCID, ...) if it becomes
> a real problem.

Relationships: has many `research_cross_authors` (the records they're credited on).

### `research_cross_authors`

The many-to-many join between `research_records` and `research_authors`. Keeps `position` so a
record's citation author order (first author, second author, ...) can be reproduced on the public
page instead of coming back in whatever order the join returns rows.

| Column               | Prisma type | Postgres type | Constraints                                               |
| -------------------- | ----------- | ------------- | --------------------------------------------------------- |
| `id`                 | `String`    | `uuid`        | PK, `gen_random_uuid()`                                   |
| `research_id`        | `String`    | `uuid`        | FK → `research_records.id`, `ON DELETE CASCADE`, not null |
| `research_author_id` | `String`    | `uuid`        | FK → `research_authors.id`, `ON DELETE CASCADE`, not null |
| `position`           | `Int`       | `integer`     | not null — 0-based order within the record's author list  |

Constraints: `UNIQUE (research_id, research_author_id)` (an author can't be credited twice on the
same record); indexed on `(research_id, position)` for ordered author lookups.

## `news` schema

### `news_sources`

An outlet where a news item was published (a newspaper, university newsroom, company blog, ...) —
the source shown on the public news page.

| Column       | Prisma type | Postgres type    | Constraints                            |
| ------------ | ----------- | ---------------- | -------------------------------------- |
| `id`         | `String`    | `uuid`           | PK, `gen_random_uuid()`                |
| `name`       | `String`    | `text`           | `UNIQUE`, not null                     |
| `created_at` | `DateTime`  | `timestamptz(3)` | not null, default `now()`              |
| `updated_at` | `DateTime`  | `timestamptz(3)` | not null, default `now()`, app-managed |

Relationships: has many `news_records`.

### `news_records`

A public news item shown on `/noticias`: a media article, institutional note, or external
coverage item, linked to its original source rather than a hosted copy. The Prisma model is
`News` (`prisma.news.*`); the table itself is named `news_records`, not `news`, to avoid the
`news.news` stutter under the `news` Postgres schema — the same convention `research_records`
follows under `research`.

| Column         | Prisma type | Postgres type    | Constraints                                            |
| -------------- | ----------- | ---------------- | ------------------------------------------------------ |
| `id`           | `String`    | `uuid`           | PK, `gen_random_uuid()`                                |
| `title`        | `String`    | `text`           | not null                                               |
| `published_at` | `DateTime?` | `date`           | nullable — not every item has a known date; indexed    |
| `source_id`    | `String`    | `uuid`           | FK → `news_sources.id`, `ON DELETE RESTRICT`, not null |
| `abstract`     | `String`    | `text`           | not null                                               |
| `external_url` | `String`    | `text`           | `UNIQUE`, not null — link to the original source       |
| `image_url`    | `String`    | `text`           | not null                                               |
| `created_at`   | `DateTime`  | `timestamptz(3)` | not null, default `now()`                              |
| `updated_at`   | `DateTime`  | `timestamptz(3)` | not null, default `now()`, app-managed                 |

> `published_at` is nullable rather than defaulted to a sentinel date: some coverage (e.g.
> corporate blog posts) doesn't carry a publish date at all. `getNews()` renders these as
> "Sin fecha" and sorts them after every dated record (`nulls: 'last'`) instead of showing a
> fabricated date.

Relationships: belongs to one `news_sources` row; has many `news_cross_authors` (its authors,
through the join table below).

### `news_authors`

A person credited as an author on one or more news items.

| Column       | Prisma type | Postgres type    | Constraints                            |
| ------------ | ----------- | ---------------- | -------------------------------------- |
| `id`         | `String`    | `uuid`           | PK, `gen_random_uuid()`                |
| `name`       | `String`    | `text`           | `UNIQUE`, not null — see note below    |
| `created_at` | `DateTime`  | `timestamptz(3)` | not null, default `now()`              |
| `updated_at` | `DateTime`  | `timestamptz(3)` | not null, default `now()`, app-managed |

> Same tradeoff as `research_authors.name`: unique by name so the same person is reused across
> records rather than duplicated, with the same caveat about accidental collisions between two
> distinct people sharing a citation form.

Relationships: has many `news_cross_authors` (the items they're credited on).

### `news_cross_authors`

The many-to-many join between `news_records` and `news_authors`. Keeps `position` so an item's
citation author order (first author, second author, ...) can be reproduced on the public page
instead of coming back in whatever order the join returns rows.

| Column           | Prisma type | Postgres type | Constraints                                            |
| ---------------- | ----------- | ------------- | ------------------------------------------------------ |
| `id`             | `String`    | `uuid`        | PK, `gen_random_uuid()`                                |
| `news_id`        | `String`    | `uuid`        | FK → `news_records.id`, `ON DELETE CASCADE`, not null  |
| `news_author_id` | `String`    | `uuid`        | FK → `news_authors.id`, `ON DELETE CASCADE`, not null  |
| `position`       | `Int`       | `integer`     | not null — 0-based order within the item's author list |

Constraints: `UNIQUE (news_id, news_author_id)` (an author can't be credited twice on the same
item); indexed on `(news_id, position)` for ordered author lookups.

## `auth` schema

### `user_role` (enum)

Access level of a portal account. Stored as a Postgres enum type so the default can live in the
database and the worker could insert a row without knowing the application's constants.

| Value       | Meaning                                                                        |
| ----------- | ------------------------------------------------------------------------------ |
| `visitor`   | Default for every self-registered account (`/acceso`)                          |
| `assistant` | Granted by an administrator; default permissions are edit and download         |
| `admin`     | Granted by an administrator; default permissions include the full resource set |

The Prisma enum is `UserRole` with members `VISITOR`, `ASSISTANT`, `ADMIN` mapped to the
lower-case database values above.

### `users`

A portal account created through the public registration form (LASCE-SEC-008-071). Browser
sessions live in `sessions` below, never in columns here.

| Column          | Prisma type | Postgres type    | Constraints                                                |
| --------------- | ----------- | ---------------- | ---------------------------------------------------------- |
| `id`            | `String`    | `uuid`           | PK, `gen_random_uuid()`                                    |
| `full_name`     | `String`    | `text`           | not null                                                   |
| `email`         | `String`    | `text`           | `UNIQUE`, not null; stored trimmed and lower-cased         |
| `institution`   | `String`    | `text`           | not null                                                   |
| `country_code`  | `String`    | `char(2)`        | not null; ISO 3166-1 alpha-2, e.g. `CR`                    |
| `password_hash` | `String`    | `text`           | not null; `scrypt$<N>$<r>$<p>$<salt>$<hash>`, never logged |
| `role`          | `UserRole`  | `auth.user_role` | not null, default `visitor`                                |
| `created_at`    | `DateTime`  | `timestamptz(3)` | not null, default `now()`                                  |
| `updated_at`    | `DateTime`  | `timestamptz(3)` | not null, default `now()`, app-managed                     |

> The unique index on `email` is on the raw column. Case-insensitivity comes from the application
> lower-casing the address before every write and lookup (see `docs/registration.md`), which is
> cheaper than a `citext` extension and keeps the worker's mirror plain. Anything that reads users
> by email must lower-case its input first.

> `role` is never taken from the registration request. The database default is the only way a
> self-registered account gets its role; changing it is LASCE-ADM #80.

Relationships: has many `sessions` (deleted with the account).

### `sessions`

A browser session for a portal account (LASCE-SEC-008-072). The `lasce_session` cookie carries a
random 32-byte token; only its SHA-256 is stored, so reading this table yields nothing a browser
could present. Deleting the row revokes the session immediately; expiry is absolute, 30 days from
login, with no sliding renewal. The worker never writes here. See `docs/sessions.md`.

| Column       | Prisma type | Postgres type    | Constraints                                               |
| ------------ | ----------- | ---------------- | --------------------------------------------------------- |
| `id`         | `String`    | `uuid`           | PK, `gen_random_uuid()`                                   |
| `user_id`    | `String`    | `uuid`           | FK → `users.id`, `ON DELETE CASCADE`, not null; indexed   |
| `token_hash` | `String`    | `text`           | `UNIQUE`, not null; base64url SHA-256 of the cookie token |
| `expires_at` | `DateTime`  | `timestamptz(3)` | not null                                                  |
| `created_at` | `DateTime`  | `timestamptz(3)` | not null, default `now()`                                 |

Relationships: belongs to one `users` row.

### `role_permissions`

Permission granted to a `UserRole` (LASCE-SEC-008-073). The permission strings are the TypeScript
catalogue in `apps/web/app/lib/auth/permissions.ts`; this table only stores the mapping so
administrators can change it without a deploy of unrelated features. See
[role-permissions.md](role-permissions.md).

| Column       | Prisma type | Postgres type    | Constraints               |
| ------------ | ----------- | ---------------- | ------------------------- |
| `id`         | `String`    | `uuid`           | PK, `gen_random_uuid()`   |
| `role`       | `UserRole`  | `auth.user_role` | not null                  |
| `permission` | `String`    | `text`           | not null                  |
| `created_at` | `DateTime`  | `timestamptz(3)` | not null, default `now()` |

Constraints: `UNIQUE (role, permission)`. The migration seeds the default matrix: visitors
download resources; assistants edit components and download; administrators create, edit and
delete components, download resources, manage users and manage permissions.

The worker never writes here.

## `solar` schema

### `suvi_frames`

One SUVI L1b frame, catalogued from its FITS header by the Python worker
(`apps/worker/app/services/process_headers.py`) after `suvi-pipeline` downloads and decodes it —
see [`suvi-downloader.md`](suvi-downloader.md#persisting-a-frame). The web app never writes here.
Photometric and CCD-health numbers (`IMG_MEAN`, `CCD_TMP1`, ...) are deliberately not columns:
they are written to InfluxDB instead, tagged by `satellite` and `channel`, under the `suvi_frames`
measurement.

| Column           | Prisma type | Postgres type    | Constraints                                             |
| ---------------- | ----------- | ---------------- | -------------------------------------------------------- |
| `id`             | `String`    | `uuid`           | PK, `gen_random_uuid()`                                  |
| `observed_at`    | `DateTime`  | `timestamptz(3)` | not null; FITS `DATE-OBS`, stamped UTC; indexed          |
| `wavelength`     | `Float`     | `double precision` | not null; FITS `WAVELNTH`, angstroms                    |
| `satellite`      | `String`    | `text`           | not null; FITS `TELESCOP`, e.g. `"G19"`                  |
| `channel`        | `String`    | `text`           | not null; archive channel token, e.g. `"Fe093"` — from the file name, not the header |
| `file_name`      | `String`    | `text`           | `UNIQUE`, not null                                       |
| `source_url`     | `String`    | `text`           | not null                                                  |
| `exposure_time`  | `Float?`    | `double precision` | nullable; FITS `EXPTIME`, seconds                       |
| `sun_center_x`   | `Float?`    | `double precision` | nullable; FITS `CRPIX1`                                 |
| `sun_center_y`   | `Float?`    | `double precision` | nullable; FITS `CRPIX2`                                 |
| `sun_radius_px`  | `Float?`    | `double precision` | nullable; FITS `RSUN` — needed to recompute the background mask |
| `quality_flag`   | `Int`       | `integer`        | not null, default `0`; bit 0 = `CONT_FLG`, bit 1 = `ECLIPSE` |
| `raw_header`     | `Json`      | `jsonb`          | not null; the whole sanitised FITS header                |
| `block_file`     | `String?`   | `text`           | nullable; MinIO object key written by `SuviMatrixProcessor.process` — see [`suvi-downloader.md`](suvi-downloader.md#pixel-blocks) |
| `block_offset`   | `BigInt?`   | `bigint`         | nullable; absolute byte offset of this frame's compressed chunk inside `block_file` |
| `block_size`     | `Int?`      | `integer`        | nullable; compressed chunk size in bytes                  |
| `is_keyframe`    | `Boolean?`  | `boolean`        | nullable; `true` for the frame that started the block, `false` for a delta |
| `created_at`     | `DateTime`  | `timestamptz(3)` | not null, default `now()`                                 |
| `updated_at`     | `DateTime`  | `timestamptz(3)` | not null, default `now()`, app-managed                    |

Constraints: `UNIQUE (satellite, channel, observed_at)` — this is what makes re-running the
pipeline idempotent, since it legitimately re-lists a window and can see the same frame twice;
the write is an upsert on this key, and `updated_at` (never `created_at`) advances on a repeat.
Indexed on `observed_at` for the time-ordered queries the public gallery will eventually run.

## Where this is read and written

`apps/web/app/lib/publications.ts`'s `getPublications()` queries `research_records` (newest
`publication_date` first, authors ordered by `position`) and maps each row to the `Publication`
shape `/investigacion` renders.

`apps/web/app/lib/news.ts`'s `getNews()` queries `news_records` (newest `published_at` first,
nulls last, authors ordered by `position`) and maps each row to the `NewsArticle` shape
`/noticias` renders.

`apps/web/app/lib/auth/users.ts` writes `auth.users` through `createUser()` (the `/acceso`
registration Server Action, mapping a unique violation on `email` to a `DuplicateEmailError`) and reads it
through `findUserByEmail()` (the `/acceso` login Server Action). `apps/web/app/lib/auth/session.ts`
owns `auth.sessions`: `createSession()` inserts a row at login, `getSessionUser()` reads the row
behind the cookie together with its user, and `deleteCurrentSession()` deletes it at logout.
`apps/web/app/lib/role-permissions.ts` owns `auth.role_permissions`;
`apps/web/app/lib/auth/authorization.ts` reads it on each permission check.

`packages/db/prisma/seed.ts` clears and repopulates the relevant research and news tables from
fixed, real LASCE research and news records so local/dev environments aren't empty.

`apps/worker/app/services/process_headers.py`'s `ProcessHeaders.persist()` is the only writer of
`solar.suvi_frames`, called from the `suvi-pipeline` processor after a frame is downloaded and
decoded. Nothing in `apps/web` reads it yet.

## Keeping this current

Whenever `packages/db/prisma/schema.prisma` changes:

1. Update this file in the same PR.
2. Mirror the change in `apps/worker/app/db/models.py` (see `AGENTS.md`).
3. Run `pnpm db:migrate --name <change>` and commit the generated migration.
