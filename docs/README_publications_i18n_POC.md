# Translating database content: the publications pattern

How the publications on `/publicaciones` are stored, read, edited and validated in Spanish and
English, and how to apply the same pattern to another editable entity.

- **Status.** Implemented for publications only, as a proof of concept. News, research areas,
  activities, researchers and the gallery are still single-language, and the fixed copy of
  `/publicaciones` (hero, filters, editor labels) is still Spanish.
- **Reference.** The API contract and the design decisions are also summarized in
  [`internationalization.md`](internationalization.md#database-content-built-for-publications-proof-of-concept);
  the tables are described in [`database-definition.md`](database-definition.md). When this guide
  and the code disagree, the code is the truth.

## 1. The rules the implementation guarantees

1. Creating a publication requires a title and an abstract in **both** Spanish and English.
2. A title or abstract that is empty or only whitespace (spaces, tabs, line breaks) is rejected.
   Text is trimmed before it is stored. The same text in both languages is allowed: official
   titles and names often stay the same.
3. An edit that changes a title or abstract sends **both** languages in full. When a field changed
   in one language only, the same field in the other language must change too or be explicitly
   confirmed as still correct, in that same edit. The rule works in both directions.
4. Editing only shared fields (authors, venue, date, research group, DOI, external link) never
   touches titles, abstracts or translations, and never asks for a missing translation.
5. Every write is atomic: the base row, the translations, the publisher and the author links are
   saved together or not at all.
6. Two editors cannot overwrite each other: a save made against an outdated version is rejected.
7. DOI and external link are optional. Absent, `null`, empty or blank values are stored as `NULL`;
   a value that is present is validated and must be unique.
8. Records saved before translations existed are kept as they are. Nothing is copied between
   languages, and their text is never assumed to be Spanish.
9. The server enforces all of this; the editor's validation is a convenience on top.

## 2. How it works end to end

### Choosing the language

The language is the one chosen in the header (ES/EN). The switcher stores it in the
`lasce_locale` cookie; `next-intl` resolves it per request, and the page reads it with
`getLocale()`. The language is not part of the URL, so a reload keeps it and links do not change.
There is no second language setting for publications.

### Reading (visitors and editors)

```text
/publicaciones (page.tsx) or GET /api/publicaciones
  -> getLocale()                       "es" | "en", from the lasce_locale cookie
  -> getPublications(locale, { includeEditingData: canEdit })
       SELECT research_records + publisher + ordered authors
              + research_record_translations (every locale except "es")
  -> for each record:
       translation for `locale` exists?  -> show it, contentLocale = locale
       otherwise                         -> show the base text
                                            contentLocale = "es" if the record is complete,
                                                            null if it is legacy (unknown)
  -> PublicationsExplorer -> PublicationCard (lang attribute = contentLocale, "" when null)
```

- `includeEditingData` adds both languages, `isLegacy` and the `version` to save against. The page
  asks for it only when the user has `edit_components`, so visitors never receive both languages.
- `lang=""` is the HTML way of saying "language unknown". It is used for legacy records instead of
  labelling their text as Spanish.

### Writing (editors)

```text
PublicationForm (tabs Español / English + shared fields)
  -> validates with the same Zod schemas as the API (publication-schema.ts)
  -> PublicationsExplorer builds the request (publication-form.ts)
       create:              POST  /api/publicaciones        { content: {es, en}, shared fields }
       content edit:        PATCH /api/publicaciones/[id]   { version, content, confirmedUnchanged?, changed shared fields }
       shared-field edit:   PATCH /api/publicaciones/[id]   { version, changed shared fields }
  -> route handler: requireApiPermission -> UUID check -> JSON -> Zod -> lib function
  -> createPublication / updatePublication: one Prisma transaction
  -> JSON response with a stable `code`, or the saved publication
```

## 3. The database

### Tables

| Table (Prisma model)                                                | Holds                                                                                              |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `research.research_records` (`Research`)                            | Shared fields and the **Spanish** `title` and `abstract`. Unchanged by the translation work.       |
| `research.research_record_translations` (`ResearchTranslation`)     | One row per record and **additional** language (today only `en`): `title`, `abstract`, timestamps. |
| `research.publishers`, `research_authors`, `research_cross_authors` | Unchanged; shared by both languages.                                                               |

```prisma
model ResearchTranslation {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  researchId String   @map("research_id") @db.Uuid
  locale     String   @db.VarChar(5)
  title      String
  abstract   String   @db.Text
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt  DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(3)

  research Research @relation(fields: [researchId], references: [id], onDelete: Cascade)

  @@unique([researchId, locale])
  @@map("research_record_translations")
  @@schema("research")
}
```

- **Why a table per entity.** It keeps foreign keys, column types and constraints, leaves every
  existing column and the worker's SQLAlchemy mirror valid, and needs no data migration. JSON
  columns (`title: { es, en }`) and a single generic translations table were rejected for losing
  exactly those properties.
- **`locale` is a string**, validated against `locales` in `apps/web/app/lib/i18n/config.ts`, so a
  new language needs no migration. Spanish never gets a row: it lives on the base table.
- **The migration** (`20261008014500_add_research_translations`) only creates the table, its unique
  index and its foreign key. No existing row was modified.
- **The worker** mirrors the table (`ResearchTranslation` in `apps/worker/app/db/models.py`) because
  the repository mirrors every Prisma model; it does not read or write it. Prisma remains the only
  migration source.

### Legacy records

A record created before the table existed has no translation row, and its base `title` and
`abstract` are in whatever language they were typed in (the seeded publications are in English).
The application therefore uses one rule: **a record is complete when it has a row for every
language other than Spanish; otherwise it is legacy, and the language of its base text is
unknown.** A record becomes complete the first time an editor saves its title and abstract in both
languages; that save also requires reviewing the base text, which is how it becomes trusted
Spanish.

### What each operation does to the tables

| Operation              | `research_records`                                 | `research_record_translations`  | Authors / publisher            |
| ---------------------- | -------------------------------------------------- | ------------------------------- | ------------------------------ |
| Create                 | Insert, with the Spanish text                      | Insert one row per other locale | Upsert publisher, link authors |
| Edit with `content`    | Update the Spanish text and any shared fields sent | Upsert one row per other locale | Only if sent                   |
| Edit without `content` | Update only the shared fields sent                 | **Untouched**                   | Only if sent                   |
| Delete                 | Delete                                             | Deleted by `ON DELETE CASCADE`  | Links cascade; authors stay    |

Every edit also moves `research_records.updated_at` forward: that column is the version used for
concurrency (section 5).

### Inspecting the data

```sql
-- Every publication with its English version, if any.
SELECT r.id, r.title AS es_title, t.title AS en_title, r.updated_at AS version
FROM research.research_records r
LEFT JOIN research.research_record_translations t
  ON t.research_id = r.id AND t.locale = 'en'
ORDER BY r.publication_date DESC;

-- Legacy records: no English row yet.
SELECT r.id, r.title
FROM research.research_records r
WHERE NOT EXISTS (
  SELECT 1 FROM research.research_record_translations t
  WHERE t.research_id = r.id AND t.locale = 'en'
);
```

## 4. Validation and the API contract

All schemas live in `apps/web/app/lib/publication-schema.ts`, which imports nothing from the
server so the editor can use them too. They are strict: an unknown key (an unsupported language,
the old single-language `title`, anything else) is rejected.

### Create: `POST /api/publicaciones` (`create_components`)

```json
{
  "content": {
    "es": { "title": "Título", "abstract": "Resumen" },
    "en": { "title": "Title", "abstract": "Abstract" }
  },
  "authors": ["Ana Mora"],
  "venue": "Solar Physics",
  "date": "2026-10-08",
  "researchGroup": "LASCE",
  "DOI": "10.1234/example",
  "href": "https://example.org/paper"
}
```

| Field                      | Rule                                                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `content.es`, `content.en` | Required, each with a non-blank `title` and `abstract`; trimmed. Messages name the language and the field.           |
| `authors`                  | At least one, each non-blank; the order is kept.                                                                     |
| `venue`                    | Required, non-blank. Publishers are shared and matched by name.                                                      |
| `date`                     | Required date string (`YYYY-MM-DD` or ISO). `null`, numbers, booleans and blank text are rejected, never 1970-01-01. |
| `researchGroup`            | `LASCE` or `ROSAC`.                                                                                                  |
| `DOI`                      | Optional. When present: `10.<registrant>/<suffix>`, without a resolver prefix such as `https://doi.org/`. Unique.    |
| `href`                     | Optional. When present: an absolute `http` or `https` URL. Unique.                                                   |

### Edit: `PATCH /api/publicaciones/[id]` (`edit_components`)

Only the fields present are written.

| Field                | Meaning                                                                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `version`            | Required. The `editing.version` the editor loaded (the record's `updated_at`).                                                                        |
| `content`            | Optional. Present: a bilingual content edit, both languages in full. Absent: a shared-field edit.                                                     |
| `confirmedUnchanged` | Only with `content`. Fields kept as they are although their counterpart changed, for example `[{ "locale": "en", "field": "title" }]`.                |
| Shared fields        | Optional, same rules as on create. For `DOI` and `href`, `null` or empty clears the value and leaving the key out keeps it. `date` cannot be cleared. |

A body with nothing to update, or with `confirmedUnchanged` but no `content`, is rejected.

### Responses

Every error has a Spanish `error` for people and a stable `code` for the editor. Validation errors
list each problem with its full path:

```json
{
  "code": "invalid-body",
  "error": "Faltan campos obligatorios o no son válidos.",
  "issues": [{ "path": "content.en.title", "message": "El título en inglés es obligatorio." }]
}
```

| Status | `code`                                       | When                                                                                  |
| ------ | -------------------------------------------- | ------------------------------------------------------------------------------------- |
| 400    | `invalid-json`, `invalid-body`, `invalid-id` | Body is not JSON, fails validation, or the id is not a UUID                           |
| 400    | `review-required`                            | A one-sided change without its counterpart; `pending` lists `{ path, locale, field }` |
| 401    | (guard)                                      | No session                                                                            |
| 403    | (guard)                                      | The role lacks the permission                                                         |
| 404    | `not-found`                                  | The publication does not exist                                                        |
| 409    | `conflict`                                   | The record changed since the editor loaded it                                         |
| 409    | `duplicate-doi`, `duplicate-external-url`    | Unique violation                                                                      |
| 500    | `internal-error`                             | Anything unexpected; the details are logged on the server only                        |

## 5. Atomicity and concurrency

Both write functions in `apps/web/app/lib/publications.ts` run inside one Prisma interactive
transaction:

```ts
// updatePublication, simplified
await prisma.$transaction(async (tx) => {
  const current = await tx.research.findUnique({ where: { id }, select: { ...text, updatedAt, translations } })
  if (!current) abort('not-found')
  if (current.updatedAt.getTime() !== expected.getTime()) abort('conflict')
  if (content) {
    const pending = findPendingReviews(stored(current), content, confirmedUnchanged)
    if (pending.length > 0) abort('review-required', pending)
  }

  const { count } = await tx.research.updateMany({
    where: { id, updatedAt: expected }, // only while nobody else saved
    data: { ...changedColumns, updatedAt: laterThan(expected) },
  })
  if (count === 0) abort('conflict') // someone saved between the check and the write

  if (content) upsert one translation row per other locale
  if (authors) replace the author links
})
```

- **Why the version check works.** The conditional `UPDATE` locks the row until the transaction
  ends. A second editor holding the same version waits, and once the first commits, PostgreSQL
  re-evaluates the `WHERE` against the new `updated_at`, matches nothing and reports `count = 0`.
  Of N simultaneous saves on one version, exactly one is stored and the others get `409`, and the
  two languages of a record are never mixed from different saves.
- **Failures roll everything back.** Expected failures (`not-found`, `conflict`,
  `review-required`) are thrown inside the transaction and turned into results outside it. Database
  errors are never caught inside the transaction, because PostgreSQL refuses further statements in
  an aborted one. A unique violation is mapped afterwards to `duplicate-doi` or
  `duplicate-external-url`, reading Prisma 7's driver-adapter error shape as well as `meta.target`.
- **Deletes** do not take a version: a delete wins over a concurrent edit, which then gets `404`.

## 6. The cross-language review rule

`findPendingReviews(stored, next, confirmed)` in `publication-schema.ts` is shared by the server and
the editor, so both always agree:

1. For each translatable field (`title`, `abstract`), compare the stored text with the new text in
   every language, ignoring surrounding whitespace. A language with no stored text yet (a legacy
   record) counts as changed.
2. If the field changed in **some but not all** languages, every language where it did not change
   must appear in `confirmedUnchanged` for that field.
3. Anything left over is reported as pending (`review-required`).

Confirmations are never stored. They apply to the version being saved: if someone else saved in the
meantime the request gets `conflict`, and the editor reloads and confirms again.

## 7. The editor

- **Tabs.** Title and abstract sit in one tab per language (Español, English), following the
  WAI-ARIA tabs pattern of `AccessTabs` (arrow keys, Home, End) and reusing its styles. The shared
  fields sit below, outside the tabs. Both panels stay mounted, so switching tabs keeps what was
  typed.
- **Problems on a hidden tab.** A tab with problems says so in its label (`English · 2 por revisar`).
  Trying to save opens the first tab with a problem and focuses its first invalid field. Errors are
  linked to their field with `aria-describedby`.
- **Review switches.** When a field changes in one language, the other language shows an
  explanation and a switch (`El título en inglés sigue siendo correcto`). The switch resets as soon
  as either language of that field changes again.
- **Legacy records.** The base text opens on the Spanish tab with a note that it may not be
  Spanish, and the English tab opens empty (`English · Sin traducción`); nothing is pre-filled. In
  edit mode, the card says the English version is missing.
- **What is sent.** Both languages only when a title or abstract changed; otherwise only the shared
  fields that changed. The version is captured when the editor opens, so a page refresh cannot
  change what is saved against. Nothing is sent when nothing changed.
- **Failures.** Validation errors from the server appear under their field and language. A conflict
  keeps what was typed and offers to close and reload instead of retrying over someone else's
  change. A network error keeps the form open. A second click while a save is in flight is
  ignored.
- **Empty list.** The add card stays available with no publications or with a search that matches
  none, as long as the user is in edit mode and has `create_components`.

## 8. Where the code lives

| File                                                                  | Responsibility                                                                                        |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `packages/db/prisma/schema.prisma`, migration `20261008014500_*`      | The `ResearchTranslation` model and table                                                             |
| `apps/worker/app/db/models.py`                                        | SQLAlchemy mirror of the table                                                                        |
| `apps/web/app/lib/publication-schema.ts`                              | Types, Zod schemas, `findPendingReviews`. No server imports                                           |
| `apps/web/app/lib/publications.ts`                                    | Reading with fallback, transactional writes, concurrency, error mapping. Re-exports the schema module |
| `apps/web/app/lib/publication-form.ts`                                | Editor logic without React: drafts, change detection, request bodies, error messages                  |
| `apps/web/app/api/publicaciones/route.ts`, `[id]/route.ts`, `http.ts` | Permissions, UUID check, parsing, status codes and error bodies                                       |
| `apps/web/app/(public)/publicaciones/page.tsx`                        | Reads the locale and the permissions, loads the publications                                          |
| `apps/web/app/components/public/publications/`                        | `PublicationForm`, `PublicationsExplorer`, `PublicationCard`                                          |
| `apps/web/app/components/public/FormField.tsx`                        | Shared field; its optional `error` prop shows a save or server error                                  |
| `apps/web/tests/e2e/publications-i18n.spec.ts`                        | End-to-end coverage of the flows above                                                                |

## 9. Applying the pattern to another entity

Adapt the pattern; do not copy the publications code blindly. Each entity has its own fields,
permissions and data.

1. **Inventory.** List the translatable fields (text a visitor reads and an editor types:
   `title`, `abstract`, `description`, `altText`, ...) and the shared ones (dates, links, images,
   proper nouns such as people and institutions). Fixed UI text does not go in the database; it
   belongs in `apps/web/messages/`. Check what language the existing rows are really in.
2. **Database.** Add `<Entity>Translation` with the entity's id, `locale`, the translatable columns
   only, `createdAt`/`updatedAt`, `@@unique([<entity>Id, locale])`, `onDelete: Cascade`, and the
   same `@@map`/`@@schema` conventions as its neighbours. Keep the base table untouched. Generate
   the migration with `pnpm db:migrate`, mirror the model in `apps/worker/app/db/models.py` with a
   test in `apps/worker/tests/test_db_models.py`, and update `database-definition.md`.
3. **Schemas.** In a client-safe module, define a strict `content` object with one entry per
   locale (use `satisfies Record<Locale, ...>` so adding a language fails to compile until it is
   handled), trimmed non-blank text, and create/update schemas. Reuse `findPendingReviews` or
   generalize it if the entity has other translatable fields.
4. **Reading.** Include the translation rows in the existing query (no extra query per record),
   overlay the requested locale, report the language actually shown, and return both languages
   plus the version only to editors.
5. **Writing.** One transaction per write; conditional update on `updated_at`; upsert translations
   only when `content` is sent; shared-field edits that never touch translations; expected
   failures thrown inside, mapped outside; unique violations identified by column.
6. **API.** Keep the existing permissions. Validate the id, return the same `code`s and full error
   paths, and never return database details. A changed request body is a breaking change: deploy
   the API and the editor together.
7. **Editor.** Reuse `PublicationForm` as the model: tabs for translatable fields, shared fields
   outside, review switches, legacy notice without pre-filling, the version captured on open, only
   changed fields sent, and errors mapped to fields.
8. **Tests.** Unit tests for schemas, persistence (mocked Prisma), routes and components;
   end-to-end tests for create, a one-sided edit with confirmation, a shared-field edit of a legacy
   record, a conflict, a delete and the language switch; axe checks on the editor.
9. **Documentation.** Update `internationalization.md` (translation status) and
   `database-definition.md` in the same PR.

## 10. Running and checking it locally

```powershell
pnpm services:up                                   # Postgres, Redis, InfluxDB, MinIO (keeps volumes)
pnpm --filter @lasce/db exec prisma migrate deploy # applies pending migrations, never resets
pnpm --filter @lasce/db exec prisma migrate status
pnpm --filter @lasce/db exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script

pnpm turbo run lint typecheck test
pnpm format:check
pnpm turbo run build --filter=@lasce/web
pnpm --filter @lasce/web exec playwright test tests/e2e/publications-i18n.spec.ts
```

- `migrate diff` must print `-- This is an empty migration.`; anything else means the schema and
  the migrations disagree.
- Do not run `prisma migrate reset` against a database whose data you need.
- Run the build from a shell where `.env` has not been exported: it sets `NODE_ENV=development`,
  which makes `next build` fail. `next.config.ts` loads `.env` on its own.
- The end-to-end spec creates and deletes its own publications; it needs Postgres and Redis.

### Acceptance checklist

- [ ] A new publication cannot be saved without both titles and both abstracts.
- [ ] Blank or whitespace-only text is rejected, with a message naming the language and field.
- [ ] A publication can be created with no DOI and no link, with only one of them, or with both.
- [ ] Switching ES/EN in the header changes the publications' text; the URL stays the same and a
      reload keeps the language.
- [ ] Changing only a shared field of a legacy record saves without asking for a translation.
- [ ] Changing a title or abstract in one language asks to update or confirm the other.
- [ ] Two editors saving the same version: the second gets a conflict and nothing is overwritten.
- [ ] A failure in the middle of a save leaves the database as it was.
- [ ] Deleting a publication removes its translations.
- [ ] Legacy records show their base text without claiming it is Spanish.

## 11. Known limitations

- Only publications are translated; the page's fixed copy and every other entity are not.
- Existing publications have no English version until an editor adds one; nothing is translated
  automatically, and the English terminology has not had an editorial review.
- Search on `/publicaciones` matches the text in the current language only.
- Editors receive both languages of every publication with the page.
- There is no language-specific URL or `hreflang`; the language is a cookie.
- Deletes do not check the version.
