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
| `gallery`       | Public photo/video gallery shown on `/galeria`         | No — see below  |

Multi-schema support is enabled via Prisma's `schemas` datasource setting (GA as of the Prisma
version this repo pins — no `previewFeatures` flag needed). Every model in `research` is tagged
`@@schema("research")`, every model in `news` is tagged `@@schema("news")`, and every model in
`auth` is tagged `@@schema("auth")`; a future domain unrelated to these should get its own schema
the same way rather than being added to one of them.

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

## `gallery` schema

Nothing reads or writes these tables yet: `/galeria` still renders from the static mock in
`apps/web/app/lib/gallery.ts`. This section documents the schema so it's kept accurate as that
mock is replaced.

### `gallery_albums`

A top-level gallery album (e.g. "ROSAC") or, when `parent_album_id` is set, a sub-album nested one
level under one (e.g. "Cimentación" under "ROSAC"). The Prisma model is `GalleryAlbum`; both
levels share this one table via a self-relation rather than two separate tables, since the mock's
`GalleryAlbum`/`GallerySubAlbum` TypeScript interfaces carry the same fields. The hierarchy is
exactly 2 levels by application convention — nothing here stops a sub-album from having its own
`parent_album_id` set to another sub-album.

| Column             | Prisma type | Postgres type    | Constraints                                                                                |
| ------------------ | ----------- | ---------------- | ------------------------------------------------------------------------------------------ |
| `id`               | `String`    | `uuid`           | PK, `gen_random_uuid()`                                                                    |
| `slug`             | `String`    | `text`           | `UNIQUE`, not null                                                                         |
| `title`            | `String`    | `text`           | not null                                                                                   |
| `description`      | `String`    | `text`           | not null                                                                                   |
| `years_label`      | `String?`   | `text`           | nullable — display string, e.g. "2025–2026"                                                |
| `parent_album_id`  | `String?`   | `uuid`           | FK → `gallery_albums.id`, `ON DELETE CASCADE`, nullable — set only for sub-albums; indexed |
| `cover_object_key` | `String?`   | `text`           | nullable — MinIO object key of the cover image, rendered decoratively (`alt=""`)           |
| `created_at`       | `DateTime`  | `timestamptz(3)` | not null, default `now()`                                                                  |
| `updated_at`       | `DateTime`  | `timestamptz(3)` | not null, default `now()`, app-managed                                                     |

Relationships: optionally belongs to one parent `gallery_albums` row; has many `gallery_albums`
(its sub-albums, deleted with it); has many `gallery_media`.

### `gallery_media`

One photo or video shown in an album's masonry grid and lightbox.

| Column          | Prisma type | Postgres type    | Constraints                                                                                                           |
| --------------- | ----------- | ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| `id`            | `String`    | `uuid`           | PK, `gen_random_uuid()`                                                                                               |
| `album_id`      | `String`    | `uuid`           | FK → `gallery_albums.id`, `ON DELETE CASCADE`, not null; indexed                                                      |
| `title`         | `String`    | `text`           | not null                                                                                                              |
| `description`   | `String`    | `text`           | not null                                                                                                              |
| `alt_text`      | `String`    | `text`           | not null — required accessibility text for the image/video still, from creation                                       |
| `object_key`    | `String`    | `text`           | `UNIQUE`, not null — key returned by `IAssetStorage.createUpload()`, since that service tracks no metadata of its own |
| `format`        | `String`    | `text`           | not null — display label, e.g. "JPG", "MP4", "FITS"; free text, not an enum                                           |
| `is_video`      | `Boolean`   | `boolean`        | not null, default `false`                                                                                             |
| `col_span`      | `Int`       | `integer`        | not null, default `1` — masonry tile footprint, 1 or 2; not DB-constrained to that range                              |
| `row_span`      | `Int`       | `integer`        | not null, default `1` — same as `col_span`                                                                            |
| `captured_at`   | `DateTime`  | `date`           | not null                                                                                                              |
| `uploader_name` | `String`    | `text`           | not null — display name only, not a `users` FK                                                                        |
| `position`      | `Int`       | `integer`        | not null — display/lightbox order within the album                                                                    |
| `created_at`    | `DateTime`  | `timestamptz(3)` | not null, default `now()`                                                                                             |
| `updated_at`    | `DateTime`  | `timestamptz(3)` | not null, default `now()`, app-managed                                                                                |

Constraints: `UNIQUE (album_id, position)` (no two media rows in the same album share a display
order).

Relationships: belongs to one `gallery_albums` row.

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

## `areas` schema

### `researchArea`

An editable research area shown on the public "investigacion" page. Each area has a stable UUID
identifier, a title, a description, and an optional image source.

| Column        | Prisma type | Postgres type    | Constraints                            |
| ------------- | ----------- | ---------------- | -------------------------------------- |
| `id`          | `String`    | `uuid`           | PK, `gen_random_uuid()`                |
| `title`       | `String`    | `text`           | not null                               |
| `description` | `String`    | `text`           | not null                               |
| `src`         | `String?`   | `text`           | nullable — optional image source       |
| `created_at`  | `DateTime`  | `timestamptz(3)` | not null, default `now()`              |
| `updated_at`  | `DateTime`  | `timestamptz(3)` | not null, default `now()`, app-managed |

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

`apps/web/app/lib/research-areas.ts`'s `getResearchAreas()` reads `public.research_areas` and
maps each row to the `ResearchArea` shape rendered by the public investigation page. The research
area create, update, and delete operations will also write this table when implemented.

Nothing yet reads or writes `gallery_albums`/`gallery_media` — `/galeria` still renders from the
static mock in `apps/web/app/lib/gallery.ts`.

## Keeping this current

Whenever `packages/db/prisma/schema.prisma` changes:

1. Update this file in the same PR.
2. Mirror the change in `apps/worker/app/db/models.py` (see `AGENTS.md`).
3. Run `pnpm db:migrate --name <change>` and commit the generated migration.
