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
| `auth`          | Portal accounts created through `/registro`            | Yes             |

Multi-schema support is enabled via Prisma's `schemas` datasource setting (GA as of the Prisma
version this repo pins — no `previewFeatures` flag needed). Every model in `research` is tagged
`@@schema("research")` and every model in `auth` is tagged `@@schema("auth")`; a future domain
unrelated to either should get its own schema the same way rather than being added to one of them.

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

## `auth` schema

### `user_role` (enum)

Access level of a portal account. Stored as a Postgres enum type so the default can live in the
database and the worker could insert a row without knowing the application's constants.

| Value       | Meaning                                                                   |
| ----------- | ------------------------------------------------------------------------- |
| `visitor`   | Default for every self-registered account (`/registro`)                   |
| `assistant` | Granted by an administrator; permissions are defined by LASCE-SEC-008-073 |
| `admin`     | Granted by an administrator; manages users, roles and permissions         |

The Prisma enum is `UserRole` with members `VISITOR`, `ASSISTANT`, `ADMIN` mapped to the
lower-case database values above.

### `users`

A portal account created through the public registration form (LASCE-SEC-008-071). Sessions
(LASCE-SEC-008-072) are not modelled yet and belong in a separate table in this schema.

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

Relationships: none yet.

## Where this is read

`apps/web/app/lib/publications.ts`'s `getPublications()` is the only reader of the `research`
schema today: it queries `research_records` (newest `publication_date` first, authors ordered by
`position`) and maps each row to the `Publication` shape `/investigacion` renders.
`packages/db/prisma/seed.ts` clears and repopulates all four research tables from a fixed, real
LASCE publication record so local/dev environments aren't empty.

`apps/web/app/lib/auth/users.ts`'s `createUser()` is the only writer of `auth.users`: it inserts
the row the `/registro` Server Action validated and maps a unique-violation on `email` to a
`DuplicateEmailError`. Nothing reads users yet; login (LASCE-SEC-008-072) will.

## Keeping this current

Whenever `packages/db/prisma/schema.prisma` changes:

1. Update this file in the same PR.
2. Mirror the change in `apps/worker/app/db/models.py` (see `AGENTS.md`).
3. Run `pnpm db:migrate --name <change>` and commit the generated migration.
