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

Multi-schema support is enabled via Prisma's `schemas` datasource setting (GA as of the Prisma
version this repo pins — no `previewFeatures` flag needed). Every model in `research` is tagged
`@@schema("research")` and every model in `news` is tagged `@@schema("news")`; a future domain
unrelated to either should get its own schema the same way rather than being added to these.

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

| Column          | Prisma type | Postgres type    | Constraints                                            |
| --------------- | ----------- | ---------------- | ------------------------------------------------------ |
| `id`            | `String`    | `uuid`           | PK, `gen_random_uuid()`                                |
| `title`         | `String`    | `text`           | not null                                               |
| `published_at`  | `DateTime?` | `date`           | nullable — not every item has a known date; indexed    |
| `source_id`     | `String`    | `uuid`           | FK → `news_sources.id`, `ON DELETE RESTRICT`, not null |
| `abstract`      | `String`    | `text`           | not null                                               |
| `external_url`  | `String`    | `text`           | `UNIQUE`, not null — link to the original source       |
| `image_url`     | `String`    | `text`           | not null                                               |
| `created_at`    | `DateTime`  | `timestamptz(3)` | not null, default `now()`                              |
| `updated_at`    | `DateTime`  | `timestamptz(3)` | not null, default `now()`, app-managed                 |

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

| Column            | Prisma type | Postgres type  | Constraints                                            |
| ----------------- | ----------- | -------------- | ------------------------------------------------------ |
| `id`              | `String`    | `uuid`         | PK, `gen_random_uuid()`                                |
| `news_id`         | `String`    | `uuid`         | FK → `news_records.id`, `ON DELETE CASCADE`, not null  |
| `news_author_id`  | `String`    | `uuid`         | FK → `news_authors.id`, `ON DELETE CASCADE`, not null  |
| `position`        | `Int`       | `integer`      | not null — 0-based order within the item's author list |

Constraints: `UNIQUE (news_id, news_author_id)` (an author can't be credited twice on the same
item); indexed on `(news_id, position)` for ordered author lookups.

## Where this is read

`apps/web/app/lib/publications.ts`'s `getPublications()` queries `research_records` (newest
`publication_date` first, authors ordered by `position`) and maps each row to the `Publication`
shape `/investigacion` renders.

`apps/web/app/lib/news.ts`'s `getNews()` queries `news_records` (newest `published_at` first,
nulls last, authors ordered by `position`) and maps each row to the `NewsArticle` shape
`/noticias` renders.

`packages/db/prisma/seed.ts` clears and repopulates all tables in both schemas from fixed, real
LASCE research and news records so local/dev environments aren't empty.

## Keeping this current

Whenever `packages/db/prisma/schema.prisma` changes:

1. Update this file in the same PR.
2. Mirror the change in `apps/worker/app/db/models.py` (see `AGENTS.md`).
3. Run `pnpm db:migrate` and commit the generated migration.
