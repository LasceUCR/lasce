# Translating database content

How editable content stored in PostgreSQL ("Modo edición") is kept in Spanish and English, and how
to make another LASCE entity bilingual with the shared building blocks.

- **Status.** The shared infrastructure is in place and **publications** (`/publicaciones`) are
  the only entity that uses it. News, research areas, activities, researchers and the gallery are
  still single-language. The fixed copy of the site (labels, buttons, the editor's own messages)
  is a different problem, handled by the message catalogues in
  [`internationalization.md`](internationalization.md).
- **Who this is for.** A developer adding bilingual editing to an entity they own. You should not
  need to read the publications code to follow it; it is listed in
  [section 5](#5-reference-implementation-publications) as a working example.
- **Code in this guide.** Two kinds, marked as such:
  - _Real API_: imports and signatures copied from the code. They compile as written.
  - _Illustrative_: a fictitious `Event` entity (an event with a `name`, an optional `summary` and
    a `startsAt` date). There is no such model, route or page in the repository; adapt the shape
    to your entity rather than copying it.
- When this guide and the code disagree, the code is the truth. Fix the guide in the same PR.

## Contents

1. [The rules every bilingual entity guarantees](#1-the-rules-every-bilingual-entity-guarantees)
2. [Architecture](#2-architecture)
3. [Implementation guide](#3-implementation-guide)
4. [Extension checklist](#4-extension-checklist)
5. [Reference implementation: publications](#5-reference-implementation-publications)
6. [Testing](#6-testing)
7. [Design decisions and limitations](#7-design-decisions-and-limitations)
8. [Shared API reference](#8-shared-api-reference)

## 1. The rules every bilingual entity guarantees

1. Every supported language is required on create. Today that is Spanish (`es`) and English
   (`en`), from `locales` in `apps/web/app/lib/i18n/config.ts`.
2. Required text that is empty or only whitespace is rejected. Text is trimmed before it is
   stored. The same text in both languages is allowed (official names often stay the same).
3. An optional translatable field is **all-or-none**: empty in every language, or filled in every
   language. This is the initial policy; see [section 7](#7-design-decisions-and-limitations).
4. An edit that changes translatable text sends every language in full. A field changed in some
   languages only must change in the others too, or be explicitly confirmed as still correct, in
   the same edit. The rule works in every direction.
5. Editing only shared (untranslated) fields never touches the translations and never asks for a
   missing translation.
6. Every write is atomic: the record, its translations and its relations are saved together or
   not at all.
7. Two editors cannot overwrite each other: a save against an outdated version is rejected.
8. Records saved before their entity became bilingual ("legacy" records) are kept as they are.
   Nothing is copied between languages, and their text is never assumed to be Spanish.
9. Nothing is translated automatically.
10. The server enforces all of this. The editor runs the same rules, from the same modules, only to
    show problems early.

## 2. Architecture

### The pieces

```text
                    ┌───────────────────────── browser ─────────────────────────┐
 header ES/EN  ───► │ lasce_locale cookie      editor (your form component)      │
 selector           │                          ├─ LanguageTabs, TranslationReview │
                    │                          ├─ lib/i18n/content/form.ts        │
                    │                          └─ lib/cms/save.ts (sendJson…)     │
                    └──────────────┬──────────────────────────┬─────────────────┘
                                   │ page request             │ POST / PATCH JSON
                    ┌──────────────▼──────────────────────────▼─────────────────┐
 server             │ page.tsx: getLocale()     route.ts: requireApiPermission   │
                    │                           ├─ lib/cms/http.ts (envelope)    │
                    │                           └─ your Zod schemas              │
                    │            your service module (queries, rules)            │
                    │            ├─ lib/i18n/content/{definition,resolve,review} │
                    │            ├─ lib/cms/transaction.ts (runWrite, WriteAbort) │
                    │            └─ lib/cms/version.ts (updated_at as version)    │
                    └──────────────────────────────┬────────────────────────────┘
                                                   │ Prisma
                    ┌──────────────────────────────▼────────────────────────────┐
 PostgreSQL         │ <entity> (Spanish text + shared fields + updated_at)       │
                    │ <entity>_translations (one row per other language)        │
                    └───────────────────────────────────────────────────────────┘
```

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

Everything shared is opt-in and composable: an entity that is not bilingual can still use
`lib/cms/*`, and a bilingual one composes the helpers in its own service, routes and form. There
is no generic CRUD layer, route factory or form renderer (see
[section 7](#7-design-decisions-and-limitations)).

### The header language and the editor tabs are different things

- The **header selector** (ES/EN) chooses the language a visitor reads. It writes the
  `lasce_locale` cookie through a Server Action; `next-intl` resolves it per request and
  `getLocale()` returns it. URLs never carry the language, so a reload keeps it.
- The **editor tabs** (`LanguageTabs`) choose which translation an editor is typing. They are
  local form state: they never call `setLocale`, never write the cookie and never refresh the
  router. An editor reading the site in English still opens the form on the Spanish tab.

### Why each entity has its own translation table

Spanish stays on the entity's own row, and every other language goes in
`<entity>_translations`, keyed by `(<entity>_id, locale)`, holding only the translatable columns.

- Foreign keys, column types and constraints (`NOT NULL`, lengths, `ON DELETE CASCADE`) keep
  working, per entity.
- Existing columns, queries and the worker's SQLAlchemy mirror stay valid; making an entity
  bilingual needs no data migration.
- `locale` is a short string validated by the app, so a new language needs no migration either.

Rejected alternatives:

- **JSON columns** (`title: { es, en }`): changes the type of every existing column, breaks the
  SQLAlchemy mirror and loses column constraints.
- **One generic table** (`entity`, `entity_id`, `field`, `locale`, `value`): no foreign keys, no
  typing, and every read becomes a pivot.

### Legacy records and fallback

A record created before its entity became bilingual has no translation rows, and its base text is
in whatever language it was typed in (the seeded publications, for one, are in English). One rule
covers it: **a record is complete when it has a translation row for every language other than
Spanish; otherwise it is legacy, and the language of its base text is unknown.** There is no
status column; `isLegacyContent` derives it from the rows.

What a visitor reading in locale `L` sees (`resolveContent`):

| Record                          | Text shown      | `contentLocale` | `lang` on the element (`contentLangAttribute`) |
| ------------------------------- | --------------- | --------------- | ---------------------------------------------- |
| Complete, `L` has a translation | The translation | `L`             | `L`                                            |
| Complete, `L` is Spanish        | The base text   | `es`            | `es`                                           |
| Legacy, any `L`                 | The base text   | `null`          | `""` (unknown language, per the HTML spec)     |

Fallback is per record, never per field: with required fields in every language and optional ones
all-or-none, a complete record always has every field it needs in every language.

A legacy record becomes complete the first time an editor saves its text in every language. That
save also requires reviewing the base text (the missing language counts as changed, so the review
rule asks for the Spanish fields), which is how the base text becomes trusted Spanish. Until then,
its shared fields can still be edited without translating it.

## 3. Implementation guide

The steps follow the order you will build in. The running example is the fictitious `Event`:
`name` (required, up to 120 characters), `summary` (optional) and `startsAt` (shared, not
translated).

### Step 1. Decide what is translatable

List every field and sort it:

- **Translatable**: text a visitor reads and an editor writes in each language (`title`,
  `abstract`, `description`, `altText`, …).
- **Shared**: everything else: dates, numbers, links, images, slugs, relations, and proper nouns
  (people, institutions, journals, instrument names).
- **Not database content**: fixed UI text (labels, buttons, messages). It belongs in
  `apps/web/messages/`, see [`internationalization.md`](internationalization.md).

Check what language the existing rows are really in. They will be legacy records (step 12).

### Step 2. Define the translatable fields

_Real API._ One call, at module scope, in a client-safe module next to your other schemas (for
example `app/lib/event-schema.ts`):

```ts
import { defineTranslatableContent } from '@/app/lib/i18n/content/definition'

export const eventContent = defineTranslatableContent({
  name: { noun: { word: 'nombre', gender: 'm' }, required: true, maxLength: 120 },
  summary: { noun: { word: 'descripción', gender: 'f' }, required: false },
})
```

- `noun` is how messages name the field. The gender drives the article and the agreement, so the
  messages read "El nombre en inglés es obligatorio." and "La descripción en español es
  obligatoria porque se completó en inglés."
- `required: false` makes the field optional and **all-or-none** across languages: absent, `null`,
  empty or blank text becomes `null`, and a value in one language makes it required in the others.
- `maxLength` counts after trimming. Field names must be letters and digits (they become paths
  such as `content.en.name`); a bad definition throws when the module loads.
- Types follow the definition: `LocalizedContent<typeof eventContent.specs>` is
  `{ name: string; summary: string | null }`, and `ContentInput<…>` has one of those per locale.

### Step 3. Write the entity's Zod schemas

_Illustrative._ Compose the definition's schemas with your shared fields. Keep the schemas strict
and in the client-safe module, so the editor validates with exactly the API's rules.

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

- `content` absent on an update means a **shared-field update**: it must not touch the
  translations (rule 5).
- Entity rules that span fields go in your own `superRefine`, on your schema, not in the shared
  definition.
- `eventContent.schema` reports issues at paths relative to `content` (`en.name`); inside your
  object they become `content.en.name`, which is what the editor and `issuesOf` expect.

### Step 4. Add the Prisma translation model and migration

_Illustrative._ Prisma is the only migration source (see `AGENTS.md`). Leave the base model as it
is and add the translation model next to it, following its `@@schema` and naming conventions:

```prisma
model Event {
  id           String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name         String             // Spanish
  summary      String?            // Spanish, optional
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
- `pnpm db:migrate` generates the migration; it must only create the table, its index and its
  foreign key. Do not copy or move existing text in it.
- Mirror the model in `apps/worker/app/db/models.py` with a test in
  `apps/worker/tests/test_db_models.py` (the repository mirrors every model), and describe the
  table in [`database-definition.md`](database-definition.md).

### Step 5. Read localized content

_Illustrative, using real API._ Load the translation rows with the record, in the same query, and
let the shared helpers decide what to show:

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

- `storedContentFrom` keeps only the defined fields of the base row and ignores translation rows
  for unsupported locales. `[...translationLocales]` is a copy because Prisma's `in` wants a
  mutable array.
- Send `editing` only to users with the edit permission: visitors never receive every language.

### Step 6. Create and update in every language

_Illustrative, using real API._ `baseContent` gives the Spanish columns, `translationRows` one row
per other language:

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
        startsAt: input.startsAt,
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

On an update, write the Spanish columns and upsert the translations **only when `content` is
present**; a shared-field update leaves both untouched (step 7 shows the whole function).

### Step 7. Atomic transactions and optimistic concurrency

_Illustrative, using real API._ The pattern for every update:

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
        ...(input.startsAt === undefined ? {} : { startsAt: input.startsAt }),
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

- **Throw, do not return, inside the transaction.** `WriteAbort` makes Prisma roll back everything
  already written; `runWrite` turns it into the failure after the rollback. Never catch a database
  error inside an interactive transaction: PostgreSQL refuses further statements in an aborted one.
- **The version is checked twice.** The read gives a clear `conflict` early; the conditional
  `updateMany` closes the gap. Its `UPDATE … WHERE updated_at = version` locks the row until
  commit, so of several saves against one version exactly one is stored and the others get
  `count = 0`, and the languages of a record are never mixed from different saves.
- **`nextUpdatedAt`** is always strictly later than the version it replaces, even within one
  millisecond or with a clock behind, so the next stale save is always caught.
- **Unique columns** (a slug, a DOI) are reported by passing a mapping as `runWrite`'s second
  argument: it receives the violated columns (`uniqueViolationColumns` reads both shapes Prisma 7
  uses) and returns your failure, or `null` to let the error through as an internal error.
- The conditional update and every query stay in your service, next to the model; only the
  primitives are shared.

### Step 8. Enforce the cross-language review

The rule, `findPendingReviews(definition, stored, next, confirmed)`:

1. For each field, compare stored and new text in every language, ignoring surrounding whitespace
   (`null` counts as empty). A language with no stored text (legacy) counts as changed.
2. If a field changed in some languages but not all, each unchanged language must be listed in
   `confirmedUnchanged` for that field.
3. A field empty in every language of the new content needs no review.
4. Whatever remains is pending: the server answers `review-required` (step 9).

The server runs it inside the transaction (step 7) against what is stored at that moment. The
editor runs the same function through `reviewsNeeded` (step 10). Confirmations are never stored:
they belong to one save, and a conflict means confirming again after reloading.

### Step 9. HTTP responses and client error handling

_Illustrative, using real API._ A route handler: guard, id, JSON, schema, service, mapped result.
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

- `sendJson` reports a request that never got an answer as status `0` and an answer that is not
  JSON as `body: null`. `parseApiError` checks every field instead of trusting the body.
- Keep a "one save at a time" guard in your component (a `useRef` flag): a second click while a
  save is in flight would send the same version again and come back as a false conflict.
- On `reopen: true`, keep what the editor typed visible and offer to close and reload; never retry
  over someone else's change.

### Step 10. Build the editor with `LanguageTabs` and `TranslationReview`

_Illustrative, using real API._ The translatable fields go inside the tabs; shared fields, relations
and media go below them, laid out as your entity needs. State stays in your component; the helpers
are pure functions.

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

- **`LanguageTabs`**: one tab per locale, named in its own language with `lang` set; WAI-ARIA tabs
  (arrow keys, Home, End, roving `tabIndex`); every panel stays mounted so typed text survives a
  tab switch; hidden panels carry `hidden`; ids come from `useId`, so several editors can coexist.
  `flags` adds "2 por revisar" or "Sin traducción" to a tab's accessible name.
- **Content language**: give each translatable field `lang={contentFieldLang(stored, locale)}`.
  It is the field's locale, or `''` for the base text of a legacy record, whose language is
  unknown. It goes on the input (`FormField`'s `lang`), not on the panel: the panel also holds
  the editor's own labels and messages, which are not in the panel's language.
- **`TranslationReview`**: the explanation (`Notice`, warning tone) and the switch (`Toggle`, role
  `switch`) under the field to review.
- **Validation**: `validateContent` checks nothing while the content is unchanged (so a shared-field
  edit of a legacy record saves without a translation), and otherwise runs your definition's schema,
  so the editor shows exactly the API's messages at the same paths, plus `editorCopy.fieldPending`
  under every unconfirmed review.
- **Request body**: as in `save()` above, send `content: toContentInput(eventContent, draft)` only
  when `hasContentChanges` is true, with the confirmations still needed
  (`confirmationsStillNeeded(confirmed, needed)`); otherwise send only the shared fields that
  changed. Always send the `version` captured when the editor opened.
- **Server errors**: merge `SaveFailure.fieldErrors` into what you show under the fields, and open
  the tab that holds one with `tabWithErrors`.
- Use your entity's existing CMS wiring (`EditModeProvider`, `EditableWrapper`, `AddItemCard`,
  `Modal`, `ConfirmDialog`) exactly as in [`add-a-cms-feature.md`](add-a-cms-feature.md).

### Step 11. Integrate with the header language selector

_Illustrative, using real API._ Nothing to build: read the request's locale on the server and
mark the language of what you render.

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
  changing the cookie re-renders the page in the new language, and a reload keeps it.

### Step 12. Historical records and incomplete translations

- Leave existing rows as they are. The migration creates only the translation table; do not copy
  the base text into it "as English", and do not assume it is Spanish.
- The reading helpers already show legacy text with `contentLocale: null` and `lang=""`.
- In the editor, `draftFromStored` opens the base text on the Spanish tab and leaves the other tabs
  empty. Tell the editor what is going on with a `Notice` on each tab, in your entity's words (the
  publications form has examples). `languageTabFlags` already marks empty tabs "Sin traducción".
- A shared-field update must work on a legacy record without translating it (rule 5).
- Completing the text asks to review the base fields (step 8); once saved, the record is complete.

### Step 13. Tests and accessibility

See [section 6](#6-testing) for what each layer covers and how to run it. Before opening the PR:

- Every new component has a story and a test that reuses the story's `args`.
- Assert roles and visible text, never CSS classes.
- An axe check (`@axe-core/playwright`) on the page and on the open editor, in both languages.
- Each translatable field carries its `lang` (`''` for a legacy record's base text); labels and
  messages carry none.
- Keyboard: tabs reachable and operable with the arrow keys; the first invalid field focused on a
  failed save; dialogs keep focus inside.

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

**Preserve**: no URL locale prefix, no second language selector, no automatic translation, no copy
of text between languages, Prisma as the only migration source, existing permissions and edit-mode
wiring.

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
(required, the `editing.version` loaded), `content` (both languages; absent means a shared-field
edit), `confirmedUnchanged` (only with `content`), and any shared field. For `DOI` and `href`,
`null` or empty clears the value and leaving the key out keeps it. A body with nothing to update
is rejected. `DELETE /api/publicaciones/[id]` (`delete_components`) answers 204, or 404.

Besides the codes in [step 9](#step-9-http-responses-and-client-error-handling), publications
answer `409 duplicate-doi` and `409 duplicate-external-url`. The exact messages and paths are
pinned in `apps/web/app/lib/publication-schema.test.ts` and the route tests.

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

They run the service against a real PostgreSQL database, with real transactions and concurrent
connections: atomic create and update, rollback when a translation write fails (forced with a
temporary trigger), four concurrent saves on one version, a stale version, duplicate DOI and link,
shared-field updates, legacy records, reading with fallback, orphan and duplicate translation rows
refused, and cascade deletes.

**They only run against a disposable database chosen for them.** `tests/integration/guard.ts`
refuses to start unless:

- `INTEGRATION_DATABASE_URL` is set (`DATABASE_URL` is never used as a fallback);
- its database name ends in `_test`;
- its host is local, or exactly `INTEGRATION_DATABASE_ALLOWED_HOST` (for a CI service container);
- it is not the same database as `DATABASE_URL`.
- its query string does not set `host`, `hostaddr` or `port` (node-postgres would connect there
  instead of the host the URL names).

The tests never empty the database: every row they create is tagged with a run id and deleted
afterwards, and the temporary trigger is dropped. They are not part of `pnpm test`.

```bash
# 1. Once: create a test database next to your development one (Docker Compose stack shown;
#    use the credentials from your own .env, never production ones).
docker compose -f infra/docker/docker-compose.yml exec postgres createdb -U lasce lasce_test

# 2. Apply the migrations to it. `migrate deploy` never resets anything.
DATABASE_URL=postgresql://lasce:lasce@localhost:5432/lasce_test pnpm db:migrate:deploy

# 3. Run the tests.
INTEGRATION_DATABASE_URL=postgresql://lasce:lasce@localhost:5432/lasce_test \
  pnpm --filter @lasce/web test:integration
```

On Windows PowerShell, set the variables first: `$env:INTEGRATION_DATABASE_URL = '…'`.

To add a file for your entity, put it in `apps/web/tests/integration/`, tag everything it creates
with a unique run id, delete only what it created, and check in `beforeAll` that the migration it
needs has been applied. They are not wired into CI yet: a job would start a PostgreSQL service,
create `lasce_test`, run `migrate deploy` and then `test:integration`.

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

- Only publications use it. The fixed copy of `/publicaciones` (hero, filters, editor labels) is
  still Spanish.
- Search on `/publicaciones` matches the text in the current language only.
- An editor receives every language of every publication with the page; there is no pagination.
- The 401 and 403 bodies from `requireApiPermission` carry no `code`.
- The database integration tests are not run in CI yet.

## 8. Shared API reference

_Real API._ Signatures as exported; see each file's comments for details.

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

`@/app/lib/i18n/content/messages`: `inLanguage`, `languageNames`, `joinSpanish`, `withArticle`,
`contentMessages`, `reviewCopy`, `editorCopy` (`fieldPending`, `pending`, `missingTranslation`,
`errorSummary`).

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
