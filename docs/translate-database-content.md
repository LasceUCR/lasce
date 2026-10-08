# Translating database content

A practical guide to managing editable Spanish/English content in PostgreSQL through LASCE's existing CMS, and to implementing the same pattern in another entity **without copying the Publications implementation**.

- **Status.** The shared infrastructure is in place and **publications** (`/publicaciones`) are the only entity currently integrated with it. News, research areas, activities, researchers and the gallery are still single-language. The fixed copy of the site (labels, buttons, the editor's own messages)

  is a different problem, handled by the message catalogues in [`internationalization.md`](internationalization.md).

- **Who this is for.** A developer adding bilingual editing to an entity they own. You should not need to read the publications code to follow it; it is listed in [section 5](#5-reference-implementation-publications) as a working example.

- **Examples.** **Real API** means the named import/function exists in the shared implementation. **Illustrative** means an incomplete or entity-specific example that must be adapted and connected before it can run. The fictitious `Event` entity (`name`, optional `summary`, shared `startsAt`) has **no Prisma model, route or page** in LASCE. Do not paste the snippets as one ready-made feature.
- **Scope.** Only `/publicaciones` has been integrated with the shared infrastructure. The remaining managed sections belong to their respective owners. This guide documents **how** to extend the pattern; it does not implement those features.
- **Release status.** Documentation of a completed local implementation does not imply that this branch has been merged into `development` or deployed to production.
- **Source of truth.** If this guide and the code disagree, verify the actual exported signatures and existing tests, then fix the guide in the same PR. The snippets below were derived from the supplied implementation guide, not recompiled against the user's current working tree as part of this document edit.

### Before you start

1. Read [`internationalization.md`](internationalization.md) and [`add-a-cms-feature.md`](add-a-cms-feature.md); identify the entity and the person responsible for its backend, UI and data.
2. Confirm which **editorial text fields** need `es` and `en`, which fields are shared, and which required/optional rules the stakeholder approved.
3. Audit existing rows: **legacy base text may be in English**, even though the base model is designated as the Spanish source for new bilingual records.
4. Check the entity's current CMS permissions, Prisma model, SQLAlchemy worker mirror, UI/form and API consumers before planning migration and deployment.
5. Use an isolated development/test database and the existing project validation commands. Do not reset a shared database or run unreviewed migrations against staging/production.

## Contents

1. [The rules every bilingual entity guarantees](#1-the-rules-every-bilingual-entity-guarantees)
2. [Architecture](#2-architecture)
3. [Implementation guide](#3-implementation-guide)
4. [Extension checklist](#4-extension-checklist)
5. [Reference implementation: publications](#5-reference-implementation-publications)
6. [Testing](#6-testing)
7. [Design decisions and limitations](#7-design-decisions-and-limitations)
8. [Shared API reference](#8-shared-api-reference)
9. [Troubleshooting](#9-troubleshooting)

## 1. The rules every bilingual entity guarantees

1. Every supported language is required on create. Today that is Spanish (`es`) and English (`en`), from `locales` in `apps/web/app/lib/i18n/config.ts`.

2. Required text that is empty or only whitespace is rejected. Text is trimmed before it is stored. The same text in both languages is allowed (official names often stay the same).

3. An optional translatable field is **all-or-none**: empty in every language, or filled in every language. This is the initial policy; see [section 7](#7-design-decisions-and-limitations).

4. An edit that changes translatable text sends every language in full. A field changed in some languages only must change in the others too, or be explicitly confirmed as still correct, in the same edit. The rule works in every direction.

5. Editing only shared (untranslated) fields never touches the translations and never asks for a missing translation.

6. Every write is atomic: the record, its translations and its relations are saved together or not at all.

7. Two editors cannot overwrite each other: a save against an outdated version is rejected.
8. Records saved before their entity became bilingual ("legacy" records) are kept as they are.

   Nothing is copied between languages, and their text is never assumed to be Spanish.

9. Nothing is translated automatically.
10. The server enforces all of this. The editor runs the same rules, from the same modules, only to

    show problems early.

## 2. Architecture

### How the fictitious `Event` example works (end to end)

> **Illustrative:** `Event`/`EventTranslation` and `/eventos` **do not exist** in the repository. The diagram connects the real shared APIs to the steps each entity owner must implement.

```mermaid
flowchart TB
    Header["Header selector: ES / EN"] --> Cookie["lasce_locale cookie"]
    Cookie --> Locale["next-intl: getLocale()"]
    subgraph Read["Public reading path (server)"]
        Page["/eventos page or GET route"] --> Service["getEvents(locale, includeEditingData)"]
        Service --> Record[("Event: base text, shared fields, updatedAt")]
        Service --> Translation[("EventTranslation: other locales")]
        Record --> Resolver["storedContentFrom + resolveContent"]
        Translation --> Resolver
        Resolver --> PublicUI["Localized content and lang attribute"]
        Service -. "authorized editors only" .-> Editing["editing.content + editing.version"]
    end
    Locale --> Page
    subgraph Edit["Bilingual editor (browser)"]
        Editor["Open authorized CMS editor"] --> Tabs["LanguageTabs: local ES / EN tabs"]
        Tabs --> Validation["Shared form helpers + entity Zod schema"]
        Validation --> Review["TranslationReview: explicit confirmation when needed"]
        Review --> Payload["POST/PATCH content.es + content.en; PATCH version"]
    end
    PublicUI -. "edit permission" .-> Editor
    Editing --> Editor
    subgraph Write["Authorized write path (server)"]
        Api["API: permission + JSON + Zod validation"] --> Transaction["runWrite: Prisma transaction"]
        Transaction --> Checks["Cross-language review + version check on PATCH"]
    end
    Payload --> Api
    Api -. "400 invalid JSON/body or forbidden" .-> Editor
    Checks --> Record
    Checks --> Translation
    Checks -. "400 review-required or 409 conflict" .-> Editor
    Checks -- "success" --> Refresh["Refresh data in selected global locale"]
    Refresh --> Service
```

**Follow one concrete edit:**

1. A visitor selects **English** in the header. `lasce_locale` persists that choice; `getLocale()` supplies it to the server page. `getEvents()` reads `Event` plus its `EventTranslation` rows and resolves the displayed `name`/`summary`. A historical event without the required translation row displays its original base text with an **unknown** content language; it is not silently translated.
2. An authorized editor opens the event. The server has separately supplied `editing.content` and the `updated_at`-derived `editing.version`. The form opens on its **Spanish** tab regardless of the header language. Moving between editor tabs **never** changes the global cookie.
3. The editor changes `es.name` but leaves `en.name` unchanged. The shared review rule requires explicit confirmation that the English name remains valid, or an update to that English field.
4. On submit, the editor sends the **complete `content` object** (`es` and `en`), the required `version`, and any `confirmedUnchanged` acknowledgments. The API validates and checks authorization **again on the server**. The service performs the base-row update, translations and relationships in a **single transaction**, using a conditional version update to reject concurrent edits.
5. Successful saves refresh the localized view. A stale version gets **409 `conflict`**; a missing review gets **400 `review-required`**; failed writes roll back. A shared-field-only PATCH sends no `content` and **does not alter translations**.

The dashed arrows represent conditional/editor-only data or error paths; the normal read flow is independent of the editor.

### Architecture at a glance

- **Shared mechanisms:** `lib/i18n/content/*` (field definitions, schema, review, fallback, form helpers); `lib/cms/*` (HTTP, transactions, version and save); `LanguageTabs` and `TranslationReview`.
- **Per entity:** its Prisma translation table, service queries/writes, route permissions, shared-field rules, media handling, cards and form layout.
- **Never couple them:** the header selects the **public presentation language**; editor tabs select the **translation being edited**.

### Who does what

| Module                                            | Responsibility                                                                                                                                                   | Server / client                |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `app/lib/i18n/content/definition.ts`              | `defineTranslatableContent`: the fields, their Zod schema (every locale, trimming, required/optional, all-or-none), confirmation schema                          | Both. No React, Prisma or Next |
| `app/lib/i18n/content/resolve.ts`                 | Base row + translation rows → stored content; locale resolution and fallback; legacy detection; `lang` attribute; rows to write                                  | Both                           |
| `app/lib/i18n/content/review.ts`                  | The cross-language review rule and its messages                                                                                                                  | Both                           |
| `app/lib/i18n/content/form.ts`                    | Editor logic without React: drafts, change detection, validation, tab flags, error summary, request content                                                      | Both                           |
| `app/lib/i18n/content/messages.ts`                | The Spanish wording of all of the above, built from each field's noun and gender                                                                                 | Both                           |
| `app/components/public/cms/LanguageTabs.tsx`      | Accessible language tabs for the translatable fields of a form                                                                                                   | Client                         |
| `app/components/public/cms/TranslationReview.tsx` | The review explanation and its confirmation switch                                                                                                               | Client                         |
| `app/lib/cms/http.ts`                             | The JSON error envelope, issue paths, `readJson`, `isUuid`, common responses                                                                                     | Server (`next/server`)         |
| `app/lib/cms/transaction.ts`                      | `runWrite` and `WriteAbort`: one transaction, expected failures classified after rollback, unique violations                                                     | Server (Prisma)                |
| `app/lib/cms/version.ts`                          | `updated_at` as the optimistic-concurrency version                                                                                                               | Both                           |
| `app/lib/cms/save.ts`                             | `sendJson` and the building blocks to turn an API error into what an editor shows                                                                                | Client-safe                    |
| **Your entity's modules**                         | Prisma models and migration, queries and relations, business rules, permissions, shared-field validation, routes and their messages, form layout, cards, filters | Yours                          |

Everything shared is opt-in and composable: an entity that is not bilingual can still use `lib/cms/*`, and a bilingual one composes the helpers in its own service, routes and form. There is no generic CRUD layer, route factory or form renderer (see [section 7](#7-design-decisions-and-limitations)).

### Authorization, editing metadata and response boundaries

**The header locale cookie is a display preference, never authorization.** Use existing CMS permissions on the server for each write route, and check the edit permission on the server before supplying the `editing` object. A hidden Edit button in React does not protect the data or API.

| Request or data | Allowed to expose | Required check |
|---|---|---|
| Public page / public GET | Resolved public text for the chosen locale, plus an accurate `contentLocale` | Locale resolution; do **not** include hidden `editing` data |
| `editing.content`, `editing.version`, unpublished editorial state if any | Only to users authorized to edit this entity | Server-side permission check; do not rely on a client flag |
| POST / PATCH / DELETE | Only to the relevant authorized CMS roles | `requireApiPermission` on **each** write endpoint, plus input validation |
| Error response | Stable public `error`, `code`, and safe `issues` / `pending` fields | Never expose Prisma queries, database errors, stacks or secrets |

For routes serving editor-only data, confirm that caching does not inadvertently share the authorized response with public requests; follow the existing project's server and cache conventions. If a public API already has consumers, list them before making a breaking change. Keep every field needed by a public page separate from data that exists only to power editing.

### The header language and the editor tabs are different things

- The **header selector** (ES/EN) chooses the language a visitor reads. It writes the `lasce_locale` cookie through a Server Action; `next-intl` resolves it per request and `getLocale()` returns it. URLs never carry the language, so a reload keeps it.

- The **editor tabs** (`LanguageTabs`) choose which translation an editor is typing. They are local form state: they never call `setLocale`, never write the cookie and never refresh the router. An editor reading the site in English still opens the form on the Spanish tab.

### Why each entity has its own translation table

For **new bilingual records**, the Spanish text stays on the entity's base row, and every other language goes in `<entity>_translations`, keyed by `(<entity>_id, locale)`, holding only the translatable columns.

- Foreign keys, column types and constraints (`NOT NULL`, lengths, `ON DELETE CASCADE`) keep working, per entity.

- Existing columns, queries and the worker's SQLAlchemy mirror stay valid; making an entity bilingual needs no data migration.

- `locale` is a short string validated by the app, so a new language needs no migration either.

Rejected alternatives:

- **JSON columns** (`title: { es, en }`): changes the type of every existing column, breaks the SQLAlchemy mirror and loses column constraints.

- **One generic table** (`entity`, `entity_id`, `field`, `locale`, `value`): no foreign keys, no typing, and every read becomes a pivot.

### Legacy records and fallback

A record created before its entity became bilingual has no translation rows, and its base text is in whatever language it was typed in (the seeded publications, for one, are in English). One rule covers it: **a record is complete when it has a translation row for every language other than Spanish; otherwise it is legacy, and the language of its base text is unknown.** There is no status column; `isLegacyContent` derives it from the rows.

What a visitor reading in locale `L` sees (`resolveContent`):

| Record                          | Text shown      | `contentLocale` | `lang` on the element (`contentLangAttribute`) |
| ------------------------------- | --------------- | --------------- | ---------------------------------------------- |
| Complete, `L` has a translation | The translation | `L`             | `L`                                            |
| Complete, `L` is Spanish        | The base text   | `es`            | `es`                                           |
| Legacy, any `L`                 | The base text   | `null`          | `""` (unknown language, per the HTML spec)     |

Fallback is per record, never per field: with required fields in every language and optional ones all-or-none, a complete record always has every field it needs in every language.

A legacy record becomes complete the first time an editor saves its text in every language. That save also requires reviewing the base text (the missing language counts as changed, so the review rule asks for the Spanish fields), which is how the base text becomes trusted Spanish. Until then, its shared fields can still be edited without translating it.

## 3. Implementation guide

Follow these steps in order. The running example is the **fictitious** `Event`: `name` (required, max 120 characters), `summary` (optional, all-or-none) and `startsAt` (shared, not translated). Its conceptual schema, service, route and React snippets appear in different steps and **are not a self-contained copy/paste implementation**. Wire them together in your own entity module and adapt Prisma-generated types and date conversions as required.

### Step 1. Decide what is translatable

List every field and sort it:

- **Translatable**: text a visitor reads and an editor writes in each language (`title`, `abstract`, `description`, `altText`, …).

- **Shared**: everything else: dates, numbers, links, images, slugs, relations, and proper nouns (people, institutions, journals, instrument names).

- **Not database content**: fixed UI text (labels, buttons, messages). It belongs in `apps/web/messages/`, see [`internationalization.md`](internationalization.md).

Check what language the existing rows are really in. They will be legacy records (step 12).

### Field boundaries: what the current shared core can and cannot translate

`defineTranslatableContent` handles **plain-text string fields**, required or optional. It is suitable for titles, descriptions, abstracts and accessibility alt text. Nontext values (dates, numbers, booleans, URLs, image binaries and relationships) remain entity-specific shared data unless the requirements explicitly say otherwise.

Before choosing a field, answer three questions:

1. **Does the public read this as editorial text in both languages?** If yes, define it as translatable. Proper names, identifiers and DOI URLs usually remain shared, but the entity owner should confirm the domain rule.
2. **Is it really a plain string?** HTML, Markdown with embedded media, rich-text ASTs, arrays of paragraphs, localized file attachments, per-language slugs and multilingual nested collections are **not** supported by the simple field factory without additional design. Do not flatten them into strings simply to fit this API.
3. **Can it be omitted in some languages?** Today the supported optional policy is **all-or-none**: the field is empty in every locale, or present in every locale. If requirements need partially localized optional fields or per-field fallback, design that explicitly first; **do not bypass the server refinement**.

Translatable strings can be displayed within entity-specific components, and the rest of the entity (images, dates, relations, filter keys and permissions) stays unchanged. Avoid applying `lang="en"` to an entire panel containing Spanish administrative labels: apply `contentFieldLang` to the individual translated inputs and `contentLangAttribute` to displayed content.

### Step 2. Define the translatable fields

*Real API.* One call, at module scope, in a client-safe module next to your other schemas (for example `app/lib/event-schema.ts`):

```ts
import { defineTranslatableContent } from '@/app/lib/i18n/content/definition'
export const eventContent = defineTranslatableContent({
  name: { noun: { word: 'nombre', gender: 'm' }, required: true, maxLength: 120 },
  summary: { noun: { word: 'descripción', gender: 'f' }, required: false },
})
```

- `noun` is how messages name the field. The gender drives the article and the agreement, so the messages read "El nombre en inglés es obligatorio." and "La descripción en español es obligatoria porque se completó en inglés."

- `required: false` makes the field optional and **all-or-none** across languages: absent, `null`, empty or blank text becomes `null`, and a value in one language makes it required in the others.

- `maxLength` counts after trimming. Field names must be letters and digits (they become paths such as `content.en.name`); a bad definition throws when the module loads.

- Types follow the definition: `LocalizedContent<typeof eventContent.specs>` is `{ name: string; summary: string | null }`, and `ContentInput<…>` has one of those per locale.

### Step 3. Write the entity's Zod schemas

*Illustrative.* Compose the definition's schemas with your shared fields. Keep the schemas strict and in the client-safe module, so the editor validates with exactly the API's rules.

```ts
import { z } from 'zod'
import { versionSchema } from '@/app/lib/cms/version'
const startsAt = z.iso.datetime({ offset: true, error: 'La fecha de inicio no es válida.' })
export const eventCreateSchema = z.strictObject({
  content: eventContent.schema,
  startsAt,
})
export const eventUpdateSchema = z
  .strictObject({
    version: versionSchema('La versión del evento es obligatoria y debe ser la que se cargó.'),
    content: eventContent.schema.optional(),
    confirmedUnchanged: eventContent.confirmationsSchema.optional(),
    startsAt: startsAt.optional(),
  })
  .superRefine((input, context) => {
    if (input.confirmedUnchanged && !input.content) {
      context.addIssue({
        code: 'custom',
        path: ['confirmedUnchanged'],
        message: 'Las confirmaciones solo aplican a una actualización de contenido (content).',
      })
    }
    if (input.content === undefined && input.startsAt === undefined) {
      context.addIssue({ code: 'custom', path: [], message: 'La solicitud no incluye cambios.' })
    }
  })
```

- `content` absent on an update means a **shared-field update**: it must not touch the translations (rule 5).

- Entity rules that span fields go in your own `superRefine`, on your schema, not in the shared definition.

- `eventContent.schema` reports issues at paths relative to `content` (`en.name`); inside your object they become `content.en.name`, which is what the editor and `issuesOf` expect.

### Step 4. Add the Prisma translation model and migration

*Illustrative.* Prisma is the only migration source (see `AGENTS.md`). Leave the base model as it is and add the translation model next to it, following its `@@schema` and naming conventions. The example's `@@schema("news")` is **illustrative only**; keep the schema used by your actual entity and confirm that it is registered in the Prisma datasource:

```prisma
model Event {
  id           String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name         String             // Spanish for new bilingual records
  summary      String?            // Spanish for new bilingual records; optional
  startsAt     DateTime           @map("starts_at") @db.Timestamptz(3)
  createdAt    DateTime           @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt    DateTime           @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(3)
  translations EventTranslation[]
  @@map("events")
  @@schema("news")
}
model EventTranslation {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  eventId   String   @map("event_id") @db.Uuid
  locale    String   @db.VarChar(5)
  name      String
  summary   String?
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(3)
  event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)
  @@unique([eventId, locale])
  @@map("event_translations")
  @@schema("news")
}
```

- Only the translatable columns, with the same types and nullability as on the base table.
- `@@unique([eventId, locale])` and `onDelete: Cascade` are what make upserts and deletes safe.
- The base table needs `updated_at` as `Timestamptz(3)`: it is the version (step 7).
- `pnpm db:migrate` generates the migration; it must only create the table, its index and its foreign key. Do not copy or move existing text in it.

- Mirror the model in `apps/worker/app/db/models.py` with a test in `apps/worker/tests/test_db_models.py` (the repository mirrors every model), and describe the table in [`database-definition.md`](database-definition.md).

### Step 5. Read localized content

*Illustrative, using real API.* Load the translation rows with the record, in the same query, and let the shared helpers decide what to show:

```ts
import { prisma, type Prisma } from '@lasce/db'
import { toVersion } from '@/app/lib/cms/version'
import { defaultLocale, type Locale } from '@/app/lib/i18n/config'
import { translationLocales } from '@/app/lib/i18n/content/definition'
import { resolveContent, storedContentFrom } from '@/app/lib/i18n/content/resolve'
const eventInclude = {
  translations: {
    where: { locale: { in: [...translationLocales] } },
    select: { locale: true, name: true, summary: true },
  },
} satisfies Prisma.EventInclude
type EventRecord = Prisma.EventGetPayload<{ include: typeof eventInclude }>
function toEvent(record: EventRecord, locale: Locale, includeEditingData: boolean) {
  const stored = storedContentFrom(eventContent, record, record.translations)
  const { content, contentLocale, isLegacy } = resolveContent(stored, locale)
  return {
    id: record.id,
    name: content.name,
    summary: content.summary,
    startsAt: record.startsAt,
    contentLocale,
    // Both languages and the version only for someone who can edit.
    ...(includeEditingData
      ? { editing: { content: stored, isLegacy, version: toVersion(record.updatedAt) } }
      : {}),
  }
}
export async function getEvents(
  locale: Locale = defaultLocale,
  { includeEditingData = false } = {},
) {
  const records = await prisma.event.findMany({
    include: eventInclude,
    orderBy: { startsAt: 'desc' },
  })
  return records.map((record) => toEvent(record, locale, includeEditingData))
}
```

- `storedContentFrom` keeps only the defined fields of the base row and ignores translation rows for unsupported locales. `[...translationLocales]` is a copy because Prisma's `in` wants a mutable array.

- Send `editing` only to users with the edit permission: visitors never receive every language.

### Step 6. Create and update in every language

*Illustrative, using real API.* `baseContent` gives the Spanish columns, `translationRows` one row per other language:

```ts
import { runWrite, WriteAbort } from '@/app/lib/cms/transaction'
import { baseContent, translationRows } from '@/app/lib/i18n/content/resolve'
import type { ReviewConfirmation } from '@/app/lib/i18n/content/definition'
type EventField = (typeof eventContent.fields)[number]
export type EventWriteFailure =
  | { ok: false; reason: 'not-found' }
  | { ok: false; reason: 'conflict' }
  | { ok: false; reason: 'review-required'; pending: ReviewConfirmation<EventField>[] }
export async function createEvent(input: z.infer<typeof eventCreateSchema>) {
  const result = await runWrite<EventRecord, EventWriteFailure>((tx) =>
    tx.event.create({
      data: {
        ...baseContent(eventContent, input.content),
        startsAt: new Date(input.startsAt),
        translations: { create: translationRows(eventContent, input.content) },
      },
      include: eventInclude,
    }),
  )
  return result.ok
    ? { ok: true as const, event: toEvent(result.value, defaultLocale, true) }
    : result
}
```

On an update, write the Spanish columns and upsert the translations **only when `content` is present**; a shared-field update leaves both untouched (step 7 shows the whole function). The example validates `startsAt` as an ISO datetime with an offset, converts it to a `Date` before saving, and must be tested for correct time-zone round-tripping in the actual entity.

### Step 7. Atomic transactions and optimistic concurrency

*Illustrative, using real API.* The pattern for every update:

```ts
import { isCurrentVersion, nextUpdatedAt, parseVersion } from '@/app/lib/cms/version'
import { findPendingReviews } from '@/app/lib/i18n/content/review'
export async function updateEvent(id: string, input: z.infer<typeof eventUpdateSchema>) {
  const expected = parseVersion(input.version)
  const result = await runWrite<EventRecord, EventWriteFailure>(async (tx) => {
    const current = await tx.event.findUnique({
      where: { id },
      select: {
        name: true,
        summary: true,
        updatedAt: true,
        translations: eventInclude.translations,
      },
    })
    if (!current) throw new WriteAbort<EventWriteFailure>({ ok: false, reason: 'not-found' })
    if (!isCurrentVersion(current.updatedAt, expected)) {
      throw new WriteAbort<EventWriteFailure>({ ok: false, reason: 'conflict' })
    }
    const { content } = input
    if (content) {
      const stored = storedContentFrom(eventContent, current, current.translations)
      const pending = findPendingReviews(
        eventContent,
        stored,
        content,
        input.confirmedUnchanged ?? [],
      )
      if (pending.length > 0) {
        throw new WriteAbort<EventWriteFailure>({ ok: false, reason: 'review-required', pending })
      }
    }
    // Only while nobody else saved; moves the version strictly forward.
    const { count } = await tx.event.updateMany({
      where: { id, updatedAt: expected },
      data: {
        ...(content ? baseContent(eventContent, content) : {}),
        ...(input.startsAt === undefined ? {} : { startsAt: new Date(input.startsAt) }),
        updatedAt: nextUpdatedAt(expected),
      },
    })
    if (count === 0) throw new WriteAbort<EventWriteFailure>({ ok: false, reason: 'conflict' })
    if (content) {
      for (const { locale, ...text } of translationRows(eventContent, content)) {
        await tx.eventTranslation.upsert({
          where: { eventId_locale: { eventId: id, locale } },
          create: { eventId: id, locale, ...text },
          update: text,
        })
      }
    }
    return tx.event.findUniqueOrThrow({ where: { id }, include: eventInclude })
  })
  return result.ok
    ? { ok: true as const, event: toEvent(result.value, defaultLocale, true) }
    : result
}
```

Why it is shaped like this:

- **Throw, do not return, inside the transaction.** `WriteAbort` makes Prisma roll back everything already written; `runWrite` turns it into the failure after the rollback. Never catch a database error inside an interactive transaction: PostgreSQL refuses further statements in an aborted one.

- **The version is checked twice.** The read gives a clear `conflict` early; the conditional `updateMany` closes the gap. Its `UPDATE … WHERE updated_at = version` locks the row until commit, so of several saves against one version exactly one is stored and the others get `count = 0`, and the languages of a record are never mixed from different saves.

- **`nextUpdatedAt`** is always strictly later than the version it replaces, even within one millisecond or with a clock behind, so the next stale save is always caught.

- **Unique columns** (a slug, a DOI) are reported by passing a mapping as `runWrite`'s second argument: it receives the violated columns (`uniqueViolationColumns` reads both shapes Prisma 7 uses) and returns your failure, or `null` to let the error through as an internal error.

- The conditional update and every query stay in your service, next to the model; only the primitives are shared.

### Step 8. Enforce the cross-language review

The rule, `findPendingReviews(definition, stored, next, confirmed)`:

1. For each field, compare stored and new text in every language, ignoring surrounding whitespace (`null` counts as empty). A language with no stored text (legacy) counts as changed.

2. If a field changed in some languages but not all, each unchanged language must be listed in `confirmedUnchanged` for that field.

3. A field empty in every language of the new content needs no review.
4. Whatever remains is pending: the server answers `review-required` (step 9).

The server runs it inside the transaction (step 7) against what is stored at that moment. The editor runs the same function through `reviewsNeeded` (step 10). Confirmations are never stored:

they belong to one save, and a conflict means confirming again after reloading.

### Step 9. HTTP responses and client error handling

*Illustrative, using real API.* A route handler: guard, id, JSON, schema, service, mapped result.

Messages that name the entity stay in your route.

```ts
import type { NextResponse } from 'next/server'
import { requireApiPermission } from '@/app/lib/auth/apiGuard'
import {
  conflict,
  internalError,
  invalidBody,
  invalidId,
  isUuid,
  notFound,
  ok,
  readJson,
  reviewRequired,
} from '@/app/lib/cms/http'
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await requireApiPermission('edit_components')
  if (!guard.ok) return guard.response
  const { id } = await params
  if (!isUuid(id)) return invalidId('El identificador del evento no es válido.')
  const json = await readJson(request)
  if (!json.ok) return json.response
  const parsed = eventUpdateSchema.safeParse(json.body)
  if (!parsed.success) return invalidBody(parsed.error)
  try {
    const result = await updateEvent(id, parsed.data)
    if (result.ok) return ok({ event: result.event })
    switch (result.reason) {
      case 'not-found':
        return notFound(`No existe un evento con id "${id}".`)
      case 'conflict':
        return conflict(
          'El evento cambió desde que lo abrió. Recárguelo y vuelva a aplicar sus cambios.',
        )
      case 'review-required':
        return reviewRequired(result.pending)
    }
  } catch (error) {
    return internalError('No se pudo guardar el evento.', error)
  }
}
```

Every error body is `{ error, code, … }`, never cached, with no database details:

| Status   | `code`                                                   | Helper                                                            |
| -------- | -------------------------------------------------------- | ----------------------------------------------------------------- |
| 400      | `invalid-json`                                           | `readJson`                                                        |
| 400      | `invalid-body` + `issues: [{ path, message }]`           | `invalidBody` (full dotted paths; unknown keys at their own path) |
| 400      | `invalid-id`                                             | `invalidId(message)`                                              |
| 400      | `review-required` + `pending: [{ path, locale, field }]` | `reviewRequired(pending)`                                         |
| 401, 403 | (no code)                                                | `requireApiPermission`, unchanged                                 |
| 404      | `not-found`                                              | `notFound(message)`                                               |
| 409      | `conflict`                                               | `conflict(message)`                                               |
| 409      | `duplicate-<field>`                                      | `duplicate(code, message)`                                        |
| 500      | `internal-error`                                         | `internalError(message, error)`: logged on the server only        |

On the client, compose the save helpers with your own messages:

```ts
import {
  accessFailure,
  invalidBodyFailure,
  parseApiError,
  reviewRequiredFailure,
  SAVE_ERROR_MESSAGE,
  sendJson,
  unexpectedFailure,
  type SaveFailure,
} from '@/app/lib/cms/save'
import { isContentPath } from '@/app/lib/i18n/content/form'
import { editorCopy } from '@/app/lib/i18n/content/messages'
function isEventFormField(path: string) {
  return path === 'startsAt' || isContentPath(eventContent, path)
}
export function describeEventSaveFailure(status: number, body: unknown): SaveFailure {
  const error = parseApiError(body)
  if (error.code === 'invalid-body') return invalidBodyFailure(error, isEventFormField)
  if (error.code === 'review-required') return reviewRequiredFailure(error, editorCopy.fieldPending)
  if (status === 409) {
    return { message: 'Otra persona guardó cambios en este evento…', fieldErrors: {}, reopen: true }
  }
  if (status === 404) {
    return { message: 'Este evento ya no existe…', fieldErrors: {}, reopen: true }
  }
  return accessFailure(status, error) ?? unexpectedFailure(error)
}
async function save(id: string, body: unknown): Promise<SaveFailure | null> {
  const result = await sendJson(`/api/events/${id}`, 'PATCH', body)
  if (result.ok) return null
  if (result.status === 0) return { message: SAVE_ERROR_MESSAGE, fieldErrors: {}, reopen: false }
  return describeEventSaveFailure(result.status, result.body)
}
```

- `sendJson` reports a request that never got an answer as status `0` and an answer that is not JSON as `body: null`. `parseApiError` checks every field instead of trusting the body.

- Keep a "one save at a time" guard in your component (a `useRef` flag): a second click while a save is in flight would send the same version again and come back as a false conflict.

- On `reopen: true`, keep what the editor typed visible and offer to close and reload; never retry over someone else's change.

### Step 10. Build the editor with `LanguageTabs` and `TranslationReview`

*Illustrative, using real API.* The translatable fields go inside the tabs; shared fields, relations and media go below them, laid out as your entity needs. State stays in your component; the helpers are pure functions.

```tsx
'use client'
import { useState } from 'react'
import { FormField } from '@/app/components/public/FormField'
import { Notice } from '@/app/components/public/Notice'
import { LanguageTabs } from '@/app/components/public/cms/LanguageTabs'
import { TranslationReview } from '@/app/components/public/cms/TranslationReview'
import { defaultLocale, localeLabels, type Locale } from '@/app/lib/i18n/config'
import type {
  ContentInput,
  ReviewConfirmation,
  StoredContent,
} from '@/app/lib/i18n/content/definition'
import {
  confirmationsStillNeeded,
  contentFieldLang,
  contentPath,
  draftFromStored,
  errorSummary,
  hasContentChanges,
  isConfirmed,
  languageTabFlags,
  resetConfirmations,
  reviewsNeeded,
  tabWithErrors,
  toContentInput,
  validateContent,
  withConfirmation,
  type ContentDraft,
} from '@/app/lib/i18n/content/form'
import { confirmationLabel, reviewMessage } from '@/app/lib/i18n/content/review'
type EventField = (typeof eventContent.fields)[number]
interface EventContentFieldsProps {
  /** `editing.content` of the record, or `null` when creating. */
  stored: StoredContent<typeof eventContent.specs> | null
  /**
   * `content` is `null` when no translatable text changed: the caller then sends only the shared
   * fields that changed, so a legacy record can be saved without translating it.
   */
  onSave: (
    content: ContentInput<typeof eventContent.specs> | null,
    confirmed: ReviewConfirmation<EventField>[],
  ) => void
}
export function EventContentFields({ stored, onSave }: EventContentFieldsProps) {
  const [tab, setTab] = useState<Locale>(defaultLocale)
  const [draft, setDraft] = useState<ContentDraft<EventField>>(() =>
    draftFromStored(eventContent, stored),
  )
  const [confirmed, setConfirmed] = useState<ReviewConfirmation<EventField>[]>([])
  const [attempted, setAttempted] = useState(false)
  const needed = reviewsNeeded(eventContent, stored, draft)
  const errors = attempted ? validateContent(eventContent, stored, draft, confirmed) : {}
  const summary = errorSummary(errors, tab)
  function change(locale: Locale, field: EventField, value: string) {
    setDraft((current) => ({ ...current, [locale]: { ...current[locale], [field]: value } }))
    // Changing a field in any language invalidates its confirmations.
    setConfirmed((current) => resetConfirmations(current, field))
  }
  function review(locale: Locale, field: EventField) {
    const pending = needed.find((each) => each.locale === locale && each.field === field)
    if (!pending) return null
    return (
      <TranslationReview
        checked={isConfirmed(confirmed, pending)}
        label={confirmationLabel(eventContent, pending)}
        message={reviewMessage(eventContent, pending, stored, draft)}
        onChange={(checked) =>
          setConfirmed((current) => withConfirmation(current, pending, checked))
        }
      />
    )
  }
  function save() {
    setAttempted(true)
    const found = validateContent(eventContent, stored, draft, confirmed)
    if (Object.keys(found).length > 0) {
      const target = tabWithErrors(found, tab)
      if (target) setTab(target)
      // …then focus the first [aria-invalid="true"] element outside a [hidden] panel.
      return
    }
    onSave(
      hasContentChanges(eventContent, stored, draft) ? toContentInput(eventContent, draft) : null,
      confirmationsStillNeeded(confirmed, needed),
    )
  }
  return (
    <>
      <LanguageTabs
        flags={languageTabFlags(stored, errors, needed, confirmed)}
        onSelect={setTab}
        selected={tab}
      >
        {(locale) => (
          <>
            <FormField
              error={errors[contentPath(locale, 'name')]}
              id={`event-${locale}-name`}
              label={`Nombre (${localeLabels[locale]})`}
              lang={contentFieldLang(stored, locale)}
              onChange={(value) => change(locale, 'name', value)}
              required
              value={draft[locale].name}
            />
            {review(locale, 'name')}
            {/* …summary the same way, with `multiline`. */}
          </>
        )}
      </LanguageTabs>
      {/* Shared fields (startsAt, …) here, outside the tabs. */}
      {summary ? (
        <Notice role="alert" tone="error">
          {summary}
        </Notice>
      ) : null}
      <button onClick={save} type="button">
        Confirmar
      </button>
    </>
  )
}
```

What the shared pieces give you, and what to keep:

- **`LanguageTabs`**: one tab per locale, named in its own language with `lang` set; WAI-ARIA tabs (arrow keys, Home, End, roving `tabIndex`); every panel stays mounted so typed text survives a tab switch; hidden panels carry `hidden`; ids come from `useId`, so several editors can coexist.

  `flags` adds "2 por revisar" or "Sin traducción" to a tab's accessible name.

- **Content language**: give each translatable field `lang={contentFieldLang(stored, locale)}`.

  It is the field's locale, or `''` for the base text of a legacy record, whose language is unknown. It goes on the input (`FormField`'s `lang`), not on the panel: the panel also holds the editor's own labels and messages, which are not in the panel's language.

- **`TranslationReview`**: the explanation (`Notice`, warning tone) and the switch (`Toggle`, role `switch`) under the field to review.

- **Validation**: `validateContent` checks nothing while the content is unchanged (so a shared-field edit of a legacy record saves without a translation), and otherwise runs your definition's schema, so the editor shows exactly the API's messages at the same paths, plus `editorCopy.fieldPending`

  under every unconfirmed review.

- **Request body**: as in `save()` above, send `content: toContentInput(eventContent, draft)` only when `hasContentChanges` is true, with the confirmations still needed (`confirmationsStillNeeded(confirmed, needed)`); otherwise send only the shared fields that changed. Always send the `version` captured when the editor opened.

- **Server errors**: merge `SaveFailure.fieldErrors` into what you show under the fields, and open the tab that holds one with `tabWithErrors`.

- Use your entity's existing CMS wiring (`EditModeProvider`, `EditableWrapper`, `AddItemCard`, `Modal`, `ConfirmDialog`) exactly as in [`add-a-cms-feature.md`](add-a-cms-feature.md).

### Putting Steps 2–10 together: file-to-file wiring

This is the **integration map** the illustrative snippets assume. It shows where each part belongs and how requests move between them; it is not a new framework.

| File you own (example only) | Imports or calls | Contract it must satisfy |
|---|---|---|
| `app/lib/event-schema.ts` | `defineTranslatableContent`, `versionSchema`, `z.strictObject` | Exports strict create/update schemas and event-specific shared-field rules |
| `packages/db/prisma/schema.prisma` | `Event` and `EventTranslation` | Translatable base fields + one translation row per other locale; FK, uniqueness, cascade |
| `app/lib/events.ts` | `storedContentFrom`, `resolveContent`, `baseContent`, `translationRows`, `findPendingReviews`, `runWrite`, version helpers | Owns Prisma reads, transaction, relations, conditional update, and `editing` projection |
| `app/api/events/route.ts` / `[id]/route.ts` | `requireApiPermission`, `readJson`, `invalidBody`, `reviewRequired`, `conflict`, `internalError` | Guard and validate on the server; map domain failures to safe responses |
| `app/components/public/events/EventForm.tsx` | `LanguageTabs`, `TranslationReview`, `FormField`, content form helpers | Owns local ES/EN draft, confirmations, shared fields, errors, `lang` per text field |
| `app/components/public/events/EventsExplorer.tsx` | Existing CMS wrapper, `sendJson`, entity-specific failure mapping | Creates/edits/deletes with double-submit protection, preserves drafts on failure |
| `app/(public)/eventos/page.tsx` and event cards | `getLocale`, `resolveLocale`, server permission checks, `contentLangAttribute` | Sends localized public content; supplies `editing` only to authorized editors |

**Create flow (`POST`).** Validate `content` in every locale and entity-specific shared fields; authorize `create_components`; within one transaction create the base row, non-default translation rows and relationships; return the normal entity response. `Event` has no real route—the only production-ready reference for this contract is the existing Publications route.

**Edit flow (`PATCH`).** Require an opaque `version`, validate body, authorize `edit_components`, read current data inside the transaction, enforce review confirmations when `content` is present, conditionally update the base row by version, then upsert the non-default translation rows. A shared-only PATCH never writes translations. Return a conflict rather than silently retrying somebody else's changes.

**Delete flow (`DELETE`).** Authorize `delete_components` and use the entity's existing deletion workflow. The translations are removed by the entity-specific foreign key's `onDelete: Cascade`. The current Publications deletion flow has no version precondition; do not assume it solves concurrent deletes automatically.

**Public reads.** Pass the resolved header locale into the service. The returned record contains the selected language only; add an `editing` block **only after a server-side edit permission check**. Use `contentLangAttribute` for visible translated content and `contentFieldLang` for text inputs in the editor.

**Important API compatibility:** adapting an existing entity may deliberately change its JSON request shape (for example, replacing flat `title` with `content.es.title` and `content.en.title`, plus requiring `version` on PATCH). Inventory any callers first; update the corresponding frontend and backend together. Old editor tabs may stay open during a deployment and send the former payload, resulting in a validation error. Ask editors to reload; do not silently weaken the new validation for old tabs.

### Step 11. Integrate with the header language selector

*Illustrative, using real API.* Nothing to build: read the request's locale on the server and mark the language of what you render.

```tsx
// app/(public)/eventos/page.tsx
import { getLocale } from 'next-intl/server'
import { resolveLocale } from '@/app/lib/i18n/locale'
export default async function EventsPage() {
  const locale = resolveLocale(await getLocale())
  const canEdit = /* your permission check, as on the other CMS pages */ false
  const events = await getEvents(locale, { includeEditingData: canEdit })
  return <EventsExplorer events={events} />
}
```

```tsx
// In the card: the language actually shown, or "" for a legacy record.
import { contentLangAttribute } from '@/app/lib/i18n/content/resolve'
;<h3 lang={contentLangAttribute(event.contentLocale)}>{event.name}</h3>
```

- A `GET` route that returns content reads the locale the same way:

  `resolveLocale(await getLocale())`.

- Do not add a language parameter to URLs, a second selector, or a client-side language state:

  the existing header action updates the cookie and revalidates/renders the page in the selected language, and a reload preserves the choice.

### Step 12. Historical records and incomplete translations

- Leave existing rows as they are. The migration creates only the translation table; do not copy the base text into it "as English", and do not assume it is Spanish.

- The reading helpers already show legacy text with `contentLocale: null` and `lang=""`.
- In the editor, `draftFromStored` opens the base text on the Spanish tab and leaves the other tabs empty. Tell the editor what is going on with a `Notice` on each tab, in your entity's words (the publications form has examples). `languageTabFlags` already marks empty tabs "Sin traducción".

- A shared-field update must work on a legacy record without translating it (rule 5).
- Completing the text asks to review the base fields (step 8); once saved, the record is complete.

### Step 13. Tests and accessibility

See [section 6](#6-testing) for what each layer covers and how to run it. Before opening the PR:

- Every new component has a story and a test that reuses the story's `args`.
- Assert roles and visible text, never CSS classes.
- An axe check (`@axe-core/playwright`) on the page and on the open editor, in both languages.
- Each translatable field carries its `lang` (`''` for a legacy record's base text); labels and messages carry none.

- Keyboard: tabs reachable and operable with the arrow keys; the first invalid field focused on a failed save; dialogs keep focus inside.

### Step 14. Migration, rollout and compatibility

**Plan the release of each new bilingual entity as an entity-specific change**, not as a migration of the entire CMS.

1. **Preflight:** confirm field requirements and source-language assumptions with the content owner; inventory API consumers, data volumes, existing `updated_at`, foreign keys, indexes, permissions and any worker/ETL mirror.
2. **Migration review:** use Prisma to generate an **additive** translation-table migration. Review its SQL before applying it. Do **not** overwrite original content, generate fake translations, drop base columns or migrate historical values automatically. Validate the migration and worker mirror in an isolated test/staging environment before production scheduling.
3. **Coordinated deployment:** ensure schema availability before code that queries the translation table, and deploy the matching UI and API in the same application release. Account for old browser tabs still posting the previous contract. Avoid claiming simultaneous multi-service deployment where the infrastructure does not guarantee it.
4. **Post-deploy smoke checks:** public ES/EN reads; header cookie persistence; authorized and unauthorized editing paths; bilingual create; one-sided edit with confirmation; shared-only edit of a legacy record; stale version conflict; accessible `lang` attributes; application logs for 4xx/5xx. Check both desktop and mobile.
5. **Rollback plan:** application rollback must be compatible with the additive migration. Do not delete translation rows or reverse schema changes as an automatic first response. Document any API-contract rollback implications and preserve editorial data.

Production connection strings, credentials and sample secrets never belong in the guide, test fixtures, commands checked into Git, or AI-agent prompts. Follow the repository's normal review, migration approval and deployment process.

## 4. Extension checklist

For a new bilingual entity `X`:

**Database**

- [ ] `XTranslation` model: id, `xId`, `locale` (`VarChar(5)`), the translatable columns only,

      timestamps, `@@unique([xId, locale])`, `onDelete: Cascade`, same `@@map`/`@@schema`

      conventions. Base model unchanged and with `updatedAt` as `Timestamptz(3)`.

- [ ] Migration that only creates the table, generated with `pnpm db:migrate`.
- [ ] Worker mirror and its test; `database-definition.md` updated.

**Schemas and service** (`app/lib/x-schema.ts`, client-safe; `app/lib/x.ts`, server)

- [ ] `xContent = defineTranslatableContent({...})` with nouns, genders, `required`, `maxLength`.
- [ ] Strict create and update schemas; `content: xContent.schema`; `version: versionSchema(...)`;

      `confirmedUnchanged: xContent.confirmationsSchema.optional()`; your shared fields.

- [ ] Reads include the translation rows; `storedContentFrom` + `resolveContent`; `editing` only

      for editors, with `toVersion(updatedAt)`.

- [ ] Writes in `runWrite`; expected failures as `WriteAbort`; `baseContent` + `translationRows`;

      `findPendingReviews` inside the transaction; `isCurrentVersion` + conditional `updateMany` +

      `nextUpdatedAt`; translations upserted only when `content` is sent.

**Routes** (`app/api/x/route.ts`, `app/api/x/[id]/route.ts`)

- [ ] Existing permissions through `requireApiPermission`.
- [ ] `isUuid`, `readJson`, `invalidBody`, then your service; failures mapped with `notFound`,

      `conflict`, `duplicate`, `reviewRequired`; `internalError` around the call.

- [ ] Entity messages in the routes, in Spanish, naming the entity.

**Editor and page**

- [ ] Translatable fields inside `LanguageTabs`, `TranslationReview` under each field,

      shared fields outside the tabs.

- [ ] Form helpers from `lib/i18n/content/form.ts`; save failures from `lib/cms/save.ts`; one save

      at a time; version captured on open; conflicts keep the input and offer to reload.

- [ ] Page reads `resolveLocale(await getLocale())`; cards set `lang` with `contentLangAttribute`.
- [ ] Legacy notices in the entity's words.

**Tests and docs**

- [ ] Contract tests pinning messages and paths; service tests (mocked Prisma); route tests;

      component tests and stories; E2E with axe; a database integration file.

- [ ] `internationalization.md` translation status and this guide's status line updated.

**Preserve**: no URL locale prefix, no second language selector, no automatic translation, no copy of text between languages, Prisma as the only migration source, existing permissions and edit-mode wiring.

## 5. Reference implementation: publications

Publications are the working example of every step above.

### Where the code lives

| File                                                                                                             | What it shows                                                                                           |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `packages/db/prisma/schema.prisma` (`ResearchTranslation`), migration `20261008014500_add_research_translations` | Step 4                                                                                                  |
| `apps/worker/app/db/models.py`                                                                                   | The SQLAlchemy mirror                                                                                   |
| `apps/web/app/lib/publication-schema.ts`                                                                         | Steps 2–3: `publicationContent`, strict create/update schemas, DOI/URL rules. Client-safe               |
| `apps/web/app/lib/publications.ts`                                                                               | Steps 5–7: reading with fallback, `writePublication` over `runWrite`, version checks, duplicate mapping |
| `apps/web/app/api/publicaciones/route.ts`, `[id]/route.ts`, `http.ts`                                            | Step 9: routes; `http.ts` holds only the publication messages and `writeFailure`                        |
| `apps/web/app/lib/publication-form.ts`                                                                           | Steps 9–10 without React: drafts, shared-field diffing, request bodies, `describeSaveFailure`           |
| `apps/web/app/components/public/publications/PublicationForm.tsx`                                                | Step 10: tabs, review switches, legacy notices, focus on the first invalid field                        |
| `apps/web/app/components/public/publications/PublicationsExplorer.tsx`                                           | Step 9 client side: `sendJson`, one save at a time, conflict and delete handling                        |
| `apps/web/app/(public)/publicaciones/page.tsx`, `PublicationCard.tsx`                                            | Step 11: locale from the cookie, `lang` on title and abstract                                           |

### Tables

| Table (Prisma model)                                                | Holds                                                                                    |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `research.research_records` (`Research`)                            | Shared fields and the **Spanish** `title` and `abstract`                                 |
| `research.research_record_translations` (`ResearchTranslation`)     | One row per record and other language (today only `en`): `title`, `abstract`, timestamps |
| `research.publishers`, `research_authors`, `research_cross_authors` | Shared by both languages                                                                 |
| Operation              | `research_records`                                 | `research_record_translations`  | Authors / publisher            |
| ---------------------- | -------------------------------------------------- | ------------------------------- | ------------------------------ |
| Create                 | Insert, with the Spanish text                      | Insert one row per other locale | Upsert publisher, link authors |
| Edit with `content`    | Update the Spanish text and any shared fields sent | Upsert one row per other locale | Only if sent                   |
| Edit without `content` | Update only the shared fields sent                 | **Untouched**                   | Only if sent                   |
| Delete                 | Delete                                             | Deleted by `ON DELETE CASCADE`  | Links cascade; authors stay    |

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

### The `/api/publicaciones` contract

`POST /api/publicaciones` (`create_components`):

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

`PATCH /api/publicaciones/[id]` (`edit_components`) writes only the fields present: `version`

(required, the `editing.version` loaded), `content` (both languages; absent means a shared-field edit), `confirmedUnchanged` (only with `content`), and any shared field. For `DOI` and `href`, `null` or empty clears the value and leaving the key out keeps it. A body with nothing to update is rejected. `DELETE /api/publicaciones/[id]` (`delete_components`) answers 204, or 404.

Besides the codes in [step 9](#step-9-http-responses-and-client-error-handling), publications answer `409 duplicate-doi` and `409 duplicate-external-url`. The exact messages and paths are pinned in `apps/web/app/lib/publication-schema.test.ts` and the route tests.

## 6. Testing

| Layer                | Where                                                     | What it proves                                                                                                                                       | Needs                            |
| -------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Shared core          | `app/lib/i18n/content/*.test.ts`, `app/lib/cms/*.test.ts` | The helpers, with fictitious entities (`test-fixtures.ts`), and that they import no server code and name no real entity (`boundaries.test.ts`)       | Nothing                          |
| Entity contract      | e.g. `app/lib/publication-schema.test.ts`                 | Every message, issue code and path, and the review rule's outcomes, written out literally                                                            | Nothing                          |
| Service              | e.g. `app/lib/publications.test.ts`                       | Queries and transactions with a mocked Prisma client                                                                                                 | Nothing                          |
| Routes               | `app/api/<entity>/**/route.test.ts`                       | Status codes, codes and bodies for every outcome                                                                                                     | Nothing                          |
| Components           | `*.test.tsx` next to each component, reusing story `args` | Tabs, validation, review switches, legacy notices, server errors                                                                                     | Nothing                          |
| Database integration | `apps/web/tests/integration/*.test.ts`                    | Real transactions, rollback, concurrent saves, constraints, cascades, legacy behaviour                                                               | A disposable PostgreSQL database |
| End to end           | `apps/web/tests/e2e/<entity>-i18n.spec.ts`                | Language switch and reload, create, one-sided edit with confirmation, legacy shared-field edit, conflict, delete, axe in both languages, 320–1440 px | Postgres, Redis                  |

Commands (from the repository root):

```bash
pnpm --filter @lasce/web test:unit          # everything that needs no database
pnpm turbo run lint typecheck test          # what CI runs, with coverage floors
pnpm --filter @lasce/web exec playwright test tests/e2e/publications-i18n.spec.ts
```

### Database integration tests

They run the service against a real PostgreSQL database, with real transactions and concurrent connections: atomic create and update, rollback when a translation write fails (forced with a temporary trigger), four concurrent saves on one version, a stale version, duplicate DOI and link, shared-field updates, legacy records, reading with fallback, orphan and duplicate translation rows refused, and cascade deletes.

**They only run against a disposable database chosen for them.** `tests/integration/guard.ts`

refuses to start unless:

- `INTEGRATION_DATABASE_URL` is set (`DATABASE_URL` is never used as a fallback);
- its database name ends in `_test`;
- its host is local, or exactly `INTEGRATION_DATABASE_ALLOWED_HOST` (for a CI service container);
- it is not the same database as `DATABASE_URL`.
- its query string does not set `host`, `hostaddr` or `port` (node-postgres would connect there instead of the host the URL names).

The tests never empty the database: every row they create is tagged with a run id and deleted afterwards, and the temporary trigger is dropped. They are not part of `pnpm test`.

```bash
# 1. Create a NEW isolated test database in the local Docker service, if absent.
#    Adjust the local Postgres role and connection details to your own environment.
docker compose -f infra/docker/docker-compose.yml exec postgres createdb -U lasce lasce_test

# 2. Point Prisma migrations to that test database only (bash/zsh example).
DATABASE_URL='postgresql://LOCAL_USER:LOCAL_PASSWORD@localhost:5432/lasce_test' pnpm db:migrate:deploy

# 3. Run the dedicated suite (bash/zsh example).
INTEGRATION_DATABASE_URL='postgresql://LOCAL_USER:LOCAL_PASSWORD@localhost:5432/lasce_test' \
  pnpm --filter @lasce/web test:integration
```

For **Windows PowerShell**, explicitly set each variable in its own shell before the corresponding command (replace the placeholders with **local-only** credentials; do not paste production URLs):

```powershell
$env:DATABASE_URL = 'postgresql://LOCAL_USER:LOCAL_PASSWORD@localhost:5432/lasce_test'
pnpm db:migrate:deploy
Remove-Item Env:DATABASE_URL

$env:INTEGRATION_DATABASE_URL = 'postgresql://LOCAL_USER:LOCAL_PASSWORD@localhost:5432/lasce_test'
pnpm --filter @lasce/web test:integration
Remove-Item Env:INTEGRATION_DATABASE_URL
```

If you already had a `DATABASE_URL` set in the shell, **save its value first and restore it afterward** instead of blindly removing it. Creating and migrating the test database is an explicit setup step; the integration suite itself is guarded and does not use `DATABASE_URL` as a fallback.

To add a file for your entity, put it in `apps/web/tests/integration/`, tag everything it creates with a unique run id, delete only what it created, and check in `beforeAll` that the migration it needs has been applied. They are not wired into CI yet: a job would start a PostgreSQL service, create `lasce_test`, run `migrate deploy` and then `test:integration`.

### Minimum acceptance criteria for each newly bilingual entity

A teammate should not mark a new entity complete until there is evidence for **all applicable** conditions below. Use existing project test conventions; adapt the data model and error messages to the entity.

| Area | Minimum expected proof |
|---|---|
| Fields and validation | Required values rejected when blank; optional all-or-none applied; strict `content.<locale>.<field>` issue paths; unexpected keys rejected |
| Permissions and privacy | Public readers never receive `editing`; every POST/PATCH/DELETE checks permissions on the server; no stack traces, credentials or database details in errors |
| Persistence | Create and update save base, translations and relationships atomically; forced failure rolls back all changes; unique/FK constraints behave as intended |
| Review rule | Editing either language independently requires a counterpart change or fresh explicit confirmation; confirmations aren't stored as durable editorial state |
| Concurrency | Two simultaneous PATCH requests using one version cannot overwrite one another; stale saves return a conflict without partial translations |
| Shared-only changes | Updating an unrelated field on a legacy row succeeds without translating or modifying text |
| Locale reads | Header ES/EN selection and reload return the correct public text; API GET resolves the same locale; legacy source text is not falsely labeled Spanish |
| Accessibility and responsive | Editor tabs support keyboard and focus; errors reach their fields; text inputs and rendered text have accurate `lang`; axe and key mobile/desktop flows pass |
| Compatibility and documentation | API consumers and worker mirrors updated where needed; no unrelated CMS behavior changed; new entity and constraints documented |

For an existing single-language entity, **capture a before/after regression baseline**. A successful build alone does not prove CRUD, data migration compatibility, accessibility or fallback correctness. Database integration tests need an explicit disposable database; they are not currently in CI. Include the required CI follow-up in the team's backlog rather than silently assuming coverage.

## 7. Design decisions and limitations

| Decision                                       | Why, and what it means for you                                                                                                                                                                                                                                             |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spanish and English only                       | `locales` in `i18n/config.ts`. The shared code never names a locale, so adding one means adding it there and naming it in `inLanguage`/`languageNames` (a type error until you do); every bilingual entity then requires it.                                               |
| Optional fields are all-or-none                | The initial policy, not a rule for every future entity. It keeps "no invented translations" true without a per-field fallback. An entity that needs a field filled in some languages only must extend `TranslatableFieldSpec` with an explicit policy and a fallback rule. |
| One translation table per entity               | Keeps foreign keys, types and constraints; no data migration; see [section 2](#why-each-entity-has-its-own-translation-table).                                                                                                                                             |
| No automatic translation                       | Editors write every language. Existing records have no translation until someone adds one.                                                                                                                                                                                 |
| Legacy detection is implicit                   | "Has a row for every other language". No status column; deleting a translation row by hand makes a record legacy again.                                                                                                                                                    |
| `updated_at` is the version                    | No extra column. The token is opaque to clients, so it can become an integer column later without changing the API. Deletes take no version.                                                                                                                               |
| No locale-prefixed URLs                        | The language is the `lasce_locale` cookie; pages have no `hreflang` alternates.                                                                                                                                                                                            |
| No generic CMS, route factory or form renderer | Each entity owns its forms, relationships, media, permissions and queries. The shared modules are small functions and two components you compose.                                                                                                                          |
| Every language in one request                  | A content update carries every language, so they are saved together and the server can enforce the review. The first design wrote one language per `PATCH` (with a `locale` parameter); it could not guarantee either.                                                     |
| Editor copy is Spanish                         | The editor's messages come from `lib/i18n/content/messages.ts` and the entity's own modules, not from the catalogues. Translating the admin interface is separate work.                                                                                                    |

Known limitations of the current implementation:

- Only publications use it. The fixed copy of `/publicaciones` (hero, filters, editor labels) is still Spanish.

- Search on `/publicaciones` matches the text in the current language only.
- An editor receives every language of every publication with the page; there is no pagination.
- The 401 and 403 bodies from `requireApiPermission` carry no `code`.
- The database integration tests are not run in CI yet.

## 8. Shared API reference

*Real API.* Signatures as exported; see each file's comments for details.

`@/app/lib/i18n/content/definition`

```ts
interface TranslatableFieldSpec { noun: SpanishNoun; required: boolean; maxLength?: number }
function defineTranslatableContent<const S extends FieldSpecs>(specs: S): TranslatableContent<S>
// TranslatableContent<S>: { specs; fields; schema; confirmationSchema; confirmationsSchema }
type LocalizedContent<S>   // required fields: string; optional: string | null
type ContentInput<S>       // { [locale]: LocalizedContent<S> }
type StoredContent<S>      // default locale always present; others LocalizedContent<S> | null
type ReviewConfirmation<F extends string = string> = { locale: Locale; field: F }
const translationLocales: readonly TranslationLocale[] // every locale but the default
```

`@/app/lib/i18n/content/resolve`

```ts
function storedContentFrom<S>(
  definition,
  base: LocalizedContent<S>,
  rows: readonly TranslationRow<S>[],
): StoredContent<S>
function isLegacyContent(stored): boolean
function resolveContent<S>(
  stored: StoredContent<S>,
  locale: Locale,
): { content; contentLocale: Locale | null; isLegacy }
function contentLangAttribute(contentLocale: Locale | null | undefined): string | undefined
function baseContent<S>(definition, input: ContentInput<S>): LocalizedContent<S>
function translationRows<S>(
  definition,
  input: ContentInput<S>,
): ({ locale: TranslationLocale } & LocalizedContent<S>)[]
```

`@/app/lib/i18n/content/review`

```ts
function findPendingReviews<F>(definition, stored, next, confirmed = []): ReviewConfirmation<F>[]
function changedLocales<F>(field, stored | null, next): Locale[]
function sameReview(a, b): boolean
function reviewMessage<F>(definition, review, stored | null, next): string
function confirmationLabel<F>(definition, review): string
```

`@/app/lib/i18n/content/form`

```ts
type ContentDraft<F> // every locale, every field, as typed (never null)
type FormErrors = Record<string, string>
contentPath(locale, field) · isContentPath(definition, path) · contentFieldLang(stored | null, locale)
emptyContentDraft(definition) · draftFromStored(definition, stored | null)
hasContentChanges(definition, stored | null, draft) · reviewsNeeded(definition, stored | null, draft)
isConfirmed(confirmed, review) · withConfirmation(confirmed, review, checked)
resetConfirmations(confirmed, field) · confirmationsStillNeeded(confirmed, needed)
validateContent(definition, stored | null, draft, confirmed): FormErrors
errorsByLocale(errors) · tabWithErrors(errors, current) · languageTabFlags(stored | null, errors, needed, confirmed)
errorSummary(errors, currentTab): string | null
toContentInput(definition, draft): ContentInput<S>
```

`@/app/lib/i18n/content/messages`: `inLanguage`, `languageNames`, `joinSpanish`, `withArticle`, `contentMessages`, `reviewCopy`, `editorCopy` (`fieldPending`, `pending`, `missingTranslation`, `errorSummary`).

`@/app/components/public/cms/LanguageTabs`

```ts
interface LanguageTabsProps {
  selected: Locale
  onSelect: (locale: Locale) => void
  flags?: Partial<Record<Locale, string | null>>
  label?: string // accessible name of the tab list; default 'Idioma del contenido'
  children: (locale: Locale) => ReactNode
}
```

`@/app/components/public/cms/TranslationReview`

```ts
interface TranslationReviewProps {
  message: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}
```

`@/app/lib/cms/http` (server)

```ts
errorResponse(status, code, error, extra?) · ok(body, status = 200)
issuesOf(error: z.ZodError): ApiIssue[] · readJson(request) · isUuid(id)
invalidJson() · invalidBody(error) · invalidId(message) · notFound(message)
conflict(message) · duplicate(`duplicate-${string}`, message) · reviewRequired(pending)
internalError(message, error)
```

`@/app/lib/cms/transaction` (server)

```ts
type WriteFailure = { ok: false; reason: string }
class WriteAbort<F extends WriteFailure> extends Error {
  readonly failure: F
}
function uniqueViolationColumns(error: unknown): string[] | null
function runWrite<T, F extends WriteFailure>(
  write: (tx: Prisma.TransactionClient) => Promise<T>,
  onUniqueViolation?: (columns: readonly string[]) => F | null,
): Promise<{ ok: true; value: T } | F>
```

`@/app/lib/cms/version`

```ts
toVersion(updatedAt: Date): string · versionSchema(message: string) · parseVersion(version: string): Date
isCurrentVersion(updatedAt: Date, expected: Date): boolean · nextUpdatedAt(expected: Date, now?: number): Date
```

`@/app/lib/cms/save` (client-safe)

```ts
interface SaveFailure { message: string; fieldErrors: Record<string, string>; reopen: boolean }
const SAVE_ERROR_MESSAGE, FIELDS_MESSAGE
sendJson(url, method: 'POST' | 'PATCH' | 'PUT' | 'DELETE', body?): Promise<JsonResult> // status 0 = no answer
parseApiError(body: unknown): ApiError
invalidBodyFailure(error, isFormField) · reviewRequiredFailure(error, fieldMessage)
accessFailure(status, error): SaveFailure | null · unexpectedFailure(error)
```

## 9. Troubleshooting

| Symptom | Most likely area | What to verify first |
|---|---|---|
| Header switches to English, but cards remain Spanish | Server reads / locale plumbing | Confirm the page and GET route call `resolveLocale(await getLocale())`, pass that locale to the service, and actually call `resolveContent`; check the `lasce_locale` cookie. Legacy records intentionally show source text in both languages. |
| Editor tabs switch the entire site's language | Incorrect coupling | `LanguageTabs` should only update local `selected` state; it must not call the header's locale action, write the cookie or trigger router refresh. |
| `400 invalid-body` with a path like `content.en.name` | Schema validation / request body | Check both locales, field names, optional all-or-none policy, trimming and the shape of the current frontend payload. Older tabs may be using a pre-deploy contract. |
| `400 review-required` | Cross-language confirmation | A field changed on one side, but the counterpart stayed the same without a fresh `confirmedUnchanged` acknowledgment. Show the requested field and locale in the UI; don't bypass the check. |
| `409 conflict` on PATCH | Optimistic concurrency | The stored `updated_at` no longer matches the editor's version. Keep the user's draft visible, reload current data and ask the editor to review changes. Don't blindly retry the stale payload. |
| "Sin traducción" or original text appears in both languages | Legacy handling | Inspect whether all non-default translation rows exist; `isLegacyContent` intentionally falls back to unknown-language base text. Do not clone it into missing locales. |
| API responds `500` for duplicate values | Unique constraint / entity-specific mapping | Check `uniqueViolationColumns` and each entity's `onUniqueViolation` mapping. Ensure expected duplicates become a controlled 409, not a database error shown to the client. |
| Validation appears on the wrong tab or focus is lost | Form paths / UI wiring | Verify full dotted Zod paths, `errorsByLocale`, `tabWithErrors`, ARIA tab selection and focus-first-invalid logic. |
| Editor text is pronounced in the wrong language | Text-field semantics | Use `lang={contentFieldLang(stored, locale)}` on each translated `FormField`; leave Spanish admin labels outside language overrides. A legacy base string of unknown language gets `lang=""`. |
| Tests refuse to start or a migration is missing | PostgreSQL test isolation | Check `INTEGRATION_DATABASE_URL`, local/allowed host, `_test` suffix, database inequality and previously applied migrations. Never work around the safety guard with staging/production credentials. |
| E2E fails in ROSAC/Datos despite no changes there | Baseline / infrastructure | Compare with `development`, rerun affected specs without concurrent resource-heavy tasks, and distinguish environmental failures from regressions. Do not suppress a reproducible new failure. |

### Where to look next

- **Actual reference implementation:** `app/lib/publication-schema.ts`, `app/lib/publications.ts`, `app/lib/publication-form.ts`, Publications API routes, `PublicationForm.tsx` and `PublicationsExplorer.tsx`.
- **Shared contracts and tests:** `app/lib/i18n/content/`, `app/lib/cms/`, `app/components/public/cms/`; see [section 8](#8-shared-api-reference).
- **CMS workflow:** [`add-a-cms-feature.md`](add-a-cms-feature.md).
- **General locale configuration and static UI text:** [`internationalization.md`](internationalization.md).
- **Database schema/migrations and worker mirror:** [`database-definition.md`](database-definition.md) and the repo's Prisma/worker models.
- **Testing commands and isolation:** [`testing.md`](testing.md).

When a new requirement does not fit the core (partial optional translations, rich text, locale-specific media or URLs), **do not duplicate a one-off substitute** or weaken core invariants. Describe the requirement, add failing tests first, and propose a small backwards-compatible extension for review.
