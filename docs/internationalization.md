# Internationalization (i18n)

How the web app renders in more than one language, how to add a string or a language, and how
database content will be translated later. This covers `apps/web` only: the worker produces codes,
never text a visitor reads.

## State of things

- The mechanism is in place and **Spanish (`es`) is the source language**. English (`en`) is the
  second language.
- The **site shell** and the **static pages** read from the message catalogues and are translated
  into English: the header navigation, the footer, the home page, Contacto, Física solar, Clima
  espacial, Herramientas científicas, Colaboraciones e Iniciativas and the academic activity page.
- The English text is a first draft. Nobody has reviewed its scientific terminology yet.
- Everything else is still hardcoded Spanish and shows in Spanish in every language. The full
  list, page by page, is in [Translation status](#translation-status).
- Database content ("Modo edición") is translated for **one entity only, as a proof of concept:
  the publications on `/publicaciones`** (title and abstract, in Spanish and English). Every other
  editable entity is still single-language. See [Dynamic content](#dynamic-content).

## How it works

The library is [`next-intl`](https://next-intl.dev), set up **without locale routing**: the
language is not part of the URL.

| Piece                                        | Role                                                                         |
| -------------------------------------------- | ---------------------------------------------------------------------------- |
| `apps/web/messages/<locale>.json`            | One catalogue per language. `es.json` defines the keys                       |
| `apps/web/app/lib/i18n/config.ts`            | `locales`, `defaultLocale`, `localeLabels`, the cookie name, the time zone   |
| `apps/web/app/lib/i18n/locale.ts`            | `resolveLocale(cookieValue)`: a supported locale, or Spanish                 |
| `apps/web/app/lib/i18n/messages.ts`          | `getMessages(locale)`: the catalogue, with Spanish filling untranslated keys |
| `apps/web/app/lib/i18n/request.ts`           | Per-request config for next-intl, registered in `next.config.ts`             |
| `apps/web/app/lib/i18n/actions.ts`           | `setLocale`, the Server Action behind the language switcher                  |
| `apps/web/app/lib/i18n/testing.tsx`          | `renderWithIntl` for component tests                                         |
| `apps/web/global.d.ts`                       | Types `t()` keys against `es.json`                                           |
| `apps/web/app/layout.tsx`                    | Sets `<html lang>` and mounts `NextIntlClientProvider`                       |
| `app/components/public/LanguageMenu.tsx`     | The control in the desktop header, rendered by `PublicHeader`                |
| `app/components/public/LanguageSwitcher.tsx` | The same choice as a native `<select>`, in the mobile menu                   |

The desktop control is a dropdown like the nav groups and the account menu (`useDisclosure`,
`.nav-group`): a globe and the current language's short label (`ES`, `EN`), opening a panel that
lists each language by its own name and marks the current one. The short label is what fits beside
the Spanish navigation just above the 1400px breakpoint; between 1401px and 1500px the navigation
also closes up to make room (`.desktop-nav` in `globals.css`).

A request goes like this:

1. `request.ts` reads the `lasce_locale` cookie and resolves it with `resolveLocale`. No cookie,
   or a value that is not in `locales`, means Spanish. The browser's `Accept-Language` header is
   **not** consulted.
2. `getMessages(locale)` returns that language's catalogue laid over the Spanish one.
3. Server Components call `getTranslations`; Client Components call `useTranslations`, fed by the
   provider in the root layout.
4. Choosing a language in the switcher calls `setLocale`, which stores the cookie for a year.
   Next then renders the current route again, in the new language, without a navigation.

### Consequences of choosing the language from a cookie

- **Every page is rendered per request.** Reading a cookie opts a route out of static
  prerendering, including the ones with `generateStaticParams`.
- **A language has no URL of its own.** There is no `hreflang`, `sitemap.ts` lists each page once,
  and a link cannot carry a language. Search engines index the Spanish site.
- Moving to `/en/...` URLs later means adopting next-intl's routing (`app/[locale]/` and a
  `proxy.ts`). Components would not change, because they only call `useTranslations` and
  `getTranslations`.

### Fallback

A key missing from a language's catalogue renders the Spanish text. A key missing from `es.json`
cannot be used at all: `t('...')` is typed against it, so `pnpm turbo run typecheck` fails.
`messages.test.ts` fails if another catalogue has a key that Spanish lacks.

## Add a string

1. Add the key to `apps/web/messages/es.json`, under the namespace of the feature it belongs to
   (`nav`, `footer`, ...). Create a namespace for a new feature rather than a catch-all.
2. Add the translation to the other catalogues. Leaving it out is allowed and falls back to
   Spanish.
3. Use it. There are three patterns, and the site shell has one example of each.

**Server Component** (`app/(public)/layout.tsx`):

```tsx
import { getTranslations } from 'next-intl/server'

const t = await getTranslations('shell')
return <a href="#main-content">{t('skipToContent')}</a>
```

**Content built on the server and passed as props** (`app/lib/contact.ts`). This is the pattern
for a page's content: the lib module keeps the structure (ids, order, links, icons, images) and a
builder fills in the text from a slice of the catalogue. The component stays presentational.

```tsx
// app/lib/contact.ts
export function getContactContent({ contact, common }: ContactMessages): ContactContent
export const contactContent = getContactContent(es) // Spanish, for stories and tests

// app/(public)/contacto/page.tsx
<ContactPage content={getContactContent(await getMessages())} />
```

`getMessages` comes from `next-intl/server` and returns the request's catalogue. The Spanish
constant keeps stories, lib tests and fixtures working without a provider. `app/lib/footer.ts`
is an older variant of the same idea that takes a translator function instead of a slice.

A page's `metadata` export becomes `generateMetadata()` reading `<namespace>.meta`.

**Client Component** (`app/components/public/PublicHeader.tsx`):

```tsx
'use client'
import { useTranslations } from 'next-intl'

const t = useTranslations('nav')
<nav aria-label={t('mainLabel')}>
```

Rules:

- Identify things by a stable id, never by their label. The header's mobile accordion is keyed by
  `id` for this reason: a label changes with the language.
- Proper nouns (institution names, people, places) and URLs are not messages.
- **No arrays in a catalogue.** Messages are nested maps of strings, and the fallback to Spanish
  works key by key. A list of cards is keyed by id (`items.magnetosphere.title`) and paragraphs
  are `p1`, `p2`, ...; the lib module lists the ids in order.
- Move Spanish text verbatim. The existing tests assert it, which makes them the regression check.
- Use ICU arguments for values, `"greeting": "Hola, {name}"`, never string concatenation: word
  order differs between languages.
- Keep `PascalCase.tsx` components presentational. `useTranslations` is fine for a component's
  own fixed UI text; content still arrives through props.

## Add a language

1. Add its code to `locales` and its own name to `localeLabels` in `app/lib/i18n/config.ts`.
2. Create `apps/web/messages/<code>.json`. It can start as `{}`.
3. Register it in `translations` in `app/lib/i18n/messages.ts`, and add it to the `test.each` list
   in `messages.test.ts`.

TypeScript reports steps 1 and 3 if either is skipped. The language menu, the Storybook
toolbar and the cookie validation all read `locales`, so nothing else changes.

## Test it

- A component that calls `useTranslations` needs the provider. Render it with `renderWithIntl`
  from `@/app/lib/i18n/testing` instead of `render`. It loads the real catalogue, so assertions
  stay on the text a visitor reads. Pass `{ locale: 'en' }` to render another language.
- A component that receives its text through props needs nothing new.
- Do not mock `next-intl` in a component test. Mock `next-intl/server` only to test code that
  calls it directly, as `request.test.ts` does.
- Storybook wraps every story in the provider (`.storybook/preview.tsx`) and has a language menu
  in the toolbar.
- `tests/e2e/language-switch.spec.ts` covers the switch end to end. The other specs run with no
  cookie, so they see Spanish.

## Translation status

Every route, and what is left. Sizes are approximate counts of user-facing strings, from an
inventory taken when the static pages were migrated.

### Translated

| Route                                    | Namespace                            | Copy built in                                             |
| ---------------------------------------- | ------------------------------------ | --------------------------------------------------------- |
| Header, footer, skip link, root metadata | `nav`, `footer`, `shell`, `metadata` | `PublicHeader.tsx`, `lib/footer.ts`                       |
| `/`                                      | `home`, `workAreas`                  | `(public)/page.tsx`, `lib/work-areas.ts`                  |
| `/contacto`                              | `contact`                            | `lib/contact.ts`                                          |
| `/fisica-solar`                          | `solarPhysics`                       | `lib/solar-astrophysics.ts`                               |
| `/clima-espacial`                        | `spaceWeather`                       | `lib/space-weather.ts`                                    |
| `/herramientas-cientificas`              | `scientificTools`                    | `lib/scientific-tools.ts`                                 |
| `/colaboraciones-e-iniciativas`          | `collaborations`                     | `lib/collaborations.ts`, `lib/research-collaborations.ts` |
| `/noticias/actividades/[slug]`           | `academicActivities`                 | `lib/academic-activities.ts`                              |

The academic activities section and its cards on `/noticias` are translated too; the rest of
that page is not.

On `/publicaciones` the publications themselves (database content) are shown in the chosen
language; the page's fixed copy (hero, filters, editor labels and messages) is still Spanish.

### Still to do

| Route                                              | Copy lives in                                                              | Approx. size                       | What makes it harder than a static page                                                                                                                                                                                                                                           |
| -------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/galeria/**`                                      | `lib/gallery.ts`, `gallery/*`                                              | 400 strings, 5,050 words           | 127 media items with title, description and alt text. Counts built by hand with no singular (`N archivos`). Client components import `mediaPlaceholder` from the lib module. Dates are display strings. The `gallery.*` tables exist, so this may become database content instead |
| `/radioastronomia`                                 | `lib/rosac.ts`, `rosac-construction.ts`, `rosac-instruments.ts`, `rosac/*` | 126 in lib, 56 in components       | The team comes from the database. Instrument cards are built at module load from Spanish product names. `rosac-construction.ts` is imported by a Playwright spec                                                                                                                  |
| `/nosotros`                                        | `lib/nosotros.ts`, `NosotrosPage`, `NosotrosActivityForm`                  | 20 in lib, 27 in components        | Activities and researchers come from the database                                                                                                                                                                                                                                 |
| `/datos`                                           | `lib/scientific-data.ts`, `scientific-data/*`                              | 66 in lib, 98 in components        | 139 labels are generated in code from Spanish pieces. Product names also reach the CSV and PNG exports. Four formatters hardcode `es-CR`                                                                                                                                          |
| `/noticias`, `/publicaciones`, `/investigacion/**` | `lib/news.ts`, `publications.ts`, `research-areas.ts` and their components | 23 in lib, 111 in components       | Mostly editing forms. Two hand-written plurals. Zod messages are repeated word for word on the client                                                                                                                                                                             |
| `/acceso`, `/cuenta`                               | `lib/auth/login.ts`, `registration.ts`, `account.ts`                       | 70 strings, 23 validation messages | `login.spec.ts` and `registro.spec.ts` import the copy objects. Client components import them too. Country names use `Intl.DisplayNames(['es'])`. The header's account links ("Ingresar", "Mi cuenta") live here                                                                  |
| `/administracion/**`                               | `lib/admin-sections.ts`, `auth/permissions.ts`, `administracion/*`         | 30 in lib, 118 in components       | Three hand-written plurals, `Intl.ListFormat('es')`, a list joined with a hardcoded "y". About 35 strings are demonstration data                                                                                                                                                  |
| `(public)/[section]`                               | inline in the page                                                         | 3 strings                          | Unreachable: all three work-area slugs are excluded and `dynamicParams = false`, so every URL returns 404. Decide whether to delete it before translating it                                                                                                                      |

### Not tied to one page

1. **Validation and error messages**, about 50 distinct. Zod schemas with inline Spanish messages
   (`lib/news.ts`, `lib/nosotros.ts`, `lib/auth/login.ts`, ...) become factories that take `t`.
   Server Actions and route handlers under `app/api/` call `getTranslations`; the cookie is
   available in both.
2. **Formatting.** Nine `Intl.*` calls and one `localeCompare` hardcode `'es-CR'` or `'es'`
   (`scientific-data/`, `lib/news.ts`, `cuenta/page.tsx`, `lib/auth/countries.ts`,
   `services/downloads/exporters/png.ts`, `UserRoleChangeDialog.tsx`). Replace them with
   next-intl's `useFormatter` / `getFormatter`, which follow the request's locale and time zone.
3. **Shared editing components** with their own text: `ConfirmDialog`, `EditableWrapper`,
   `FileDropInput`, `Select`, `Carousel`, and the default label of `InfoCard`. Their strings
   ("Confirmar", "Cancelar", "Eliminar", "Anterior", "Siguiente") are repeated across forms and
   belong in the `common` namespace. Converting one means its tests, and the tests of everything
   that renders it, move to `renderWithIntl`.
4. **Brand.** The logo alt texts in `Brand.tsx`.
5. **Scope the client provider.** The root layout passes the whole catalogue to the browser on
   every page, about 15 KB per language now. Do this before migrating ROSAC, Nosotros or the
   gallery, which would take it to 50 KB or more: pass `NextIntlClientProvider` only the
   namespaces Client Components use. It needs a safeguard, because a namespace left out fails
   only in the browser.
6. **Review of the English text** by someone who knows the terminology.
7. **Database content** for every entity except publications, designed in the next section.

## Dynamic content

Three kinds of text need three treatments:

| Kind                              | Examples                                                             | Where the translations live                    |
| --------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------- |
| UI strings                        | Buttons, labels, errors                                              | Message catalogues (above)                     |
| Long static content in code       | `lib/gallery.ts`, `lib/rosac.ts`                                     | Its own catalogue file per language, see below |
| Database content ("Modo edición") | News, publications, research areas, activities, researchers, gallery | A translation table per entity, see below      |

### Long static content

`lib/gallery.ts` and `lib/rosac.ts` hold hundreds of lines of structured content. The static
pages showed that prose fits the catalogue well when the lib module keeps the structure and the
catalogue holds keyed text, so the same pattern applies. What changes at that size is where the
text is loaded: give each its own catalogue file per language (`messages/es/gallery.json`) so it
is not sent with every page, and settle the provider scoping above first.

### Database content: built for publications (proof of concept)

Publications (`Research`, shown on `/publicaciones`) are the first and, so far, only entity whose
database text is translated. It is a proof of concept for the pattern, not a migration of the
site: news, research areas, activities, researchers and the gallery are still single-language.

#### Storage

```prisma
model ResearchTranslation {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  researchId String   @map("research_id") @db.Uuid
  locale     String   @db.VarChar(5)
  title      String
  abstract   String   @db.Text
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt  DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(3)
  research   Research @relation(fields: [researchId], references: [id], onDelete: Cascade)

  @@unique([researchId, locale])
  @@map("research_record_translations")
  @@schema("research")
}
```

- `research_records.title` and `abstract` keep the **Spanish** text; the translation table holds one
  row per other language (today, `en`). Only `title` and `abstract` are translated: publishers and
  authors are proper nouns.
- The migration (`20261008014500_add_research_translations`) only adds the table. No existing row
  was changed and nothing was copied between languages.
- **Legacy records.** A record saved before this table existed has no translation row, and its
  base text is in whatever language it was entered in; the seeded publications, for one, are in
  English. Such a record is never assumed to be Spanish. The application treats "has a row for
  every other language" as the sign that its base text was written or confirmed as Spanish.
- `locale` is a string validated against `locales` in the app, so a new language needs no
  migration. The table is mirrored in the worker (`ResearchTranslation` in
  `apps/worker/app/db/models.py`), which does not use it.

#### Reading and fallback

`getPublications(locale, { includeEditingData })` in `app/lib/publications.ts`:

- returns `title` and `abstract` in `locale` when the record has that translation, and the base
  text otherwise;
- sets `contentLocale` to the language actually shown, or to `null` for a legacy record whose base
  text is shown, because that language is unknown;
- adds `editing` (both languages, `isLegacy`, and the `version` to save against) only when asked.
  The page asks only for a user with `edit_components`, so visitors never receive both languages.

`/publicaciones` and `GET /api/publicaciones` read the language with `getLocale()` (the
`lasce_locale` cookie the header switcher sets), so a reload keeps it and URLs do not change.
`PublicationCard` puts `lang` on the title and abstract: the real language when known, and `lang=""`
(unknown, per the HTML spec) for a legacy record, rather than claiming Spanish.

#### Writing: the API contract

Validation lives in `app/lib/publication-schema.ts`, a module with no server imports so the editor
validates with exactly the rules the API enforces. Every schema is strict: an unknown key, such as
an unsupported language or the old single-language `title`, is rejected.

`POST /api/publicaciones` (`create_components`):

```json
{
  "content": {
    "es": { "title": "…", "abstract": "…" },
    "en": { "title": "…", "abstract": "…" }
  },
  "authors": ["…"],
  "venue": "…",
  "date": "2026-10-08",
  "researchGroup": "LASCE",
  "DOI": "10.1234/example",
  "href": "https://example.org/paper"
}
```

- Both languages are required. Text is trimmed, and empty or whitespace-only text (spaces, tabs,
  line breaks) is rejected. The same text in both languages is allowed: official titles and names
  often stay the same.
- `DOI` and `href` (external link) are optional: absent, `null`, empty or blank all store `null`.
  A link must be an absolute `http`/`https` URL; a DOI must have the general form
  `10.<registrant>/<suffix>` (deliberately looser than Crossref's pattern), without a resolver
  prefix. Both stay unique.
- `date` must be a date string or a `Date`; `null`, `0`, `false` or blank text are rejected instead
  of becoming 1970-01-01.

`PATCH /api/publicaciones/[id]` (`edit_components`) writes only the fields present:

- `version` (required): the `editing.version` the editor loaded.
- **With `content`**, it is a bilingual content update: both languages in full. When a title or
  abstract changed in one language only, the same field in the other language must change too or
  be listed in `confirmedUnchanged` (`[{ "locale": "en", "field": "title" }]`), meaning the editor
  reviewed it in this operation. Confirmations are never stored. Completing a legacy record counts
  the missing language as changed, so its base text has to be reviewed too.
- **Without `content`**, it updates shared fields only (authors, venue, date, group, DOI, link).
  Titles, abstracts and translations are not touched and a missing translation is not required, so
  a legacy record can be corrected without translating it. `confirmedUnchanged` is rejected here.
- For `DOI` and `href`, `null` or empty clears the value and leaving the key out keeps it. A body
  with nothing to update is rejected.

Errors carry a Spanish `error` and a stable `code`; validation errors list each problem with its
full path (`content.en.title`):

| Status | `code`                                                     | When                                              |
| ------ | ---------------------------------------------------------- | ------------------------------------------------- |
| 400    | `invalid-json`, `invalid-body`, `invalid-id`               | Malformed body or id (ids must be UUIDs)          |
| 400    | `review-required` (+ `pending: [{ path, locale, field }]`) | One-sided change without its counterpart reviewed |
| 401    | (from `requireApiPermission`)                              | No session                                        |
| 403    | (from `requireApiPermission`)                              | Missing permission                                |
| 404    | `not-found`                                                | The publication does not exist                    |
| 409    | `conflict`                                                 | The record changed since the editor loaded it     |
| 409    | `duplicate-doi`, `duplicate-external-url`                  | Unique violation                                  |
| 500    | `internal-error`                                           | Anything else; details are only logged            |

#### Atomicity and concurrency

- `createPublication` and `updatePublication` write the base row, the translation rows, the
  publisher and the author links in one Prisma interactive transaction: all or nothing.
- Expected failures are raised inside the transaction and turned into results outside it, so
  PostgreSQL never continues an aborted transaction. A unique violation is read from Prisma 7's
  driver-adapter error shape as well as `meta.target`, to tell a DOI from a link.
- **Optimistic concurrency**: `version` is the record's `updated_at`. The update is a conditional
  `UPDATE … WHERE id = … AND updated_at = version` that also moves `updated_at` forward, so of two
  editors who loaded the same version the second gets `conflict` instead of overwriting the first.
  It applies to shared-field updates too. Deleting does not take a version.
- Deleting a publication removes its translations and author links through `ON DELETE CASCADE`.

#### The editor

`PublicationForm` and `PublicationsExplorer` (`app/components/public/publications/`), with the
rules in `app/lib/publication-form.ts`:

- Title and abstract sit in one tab per language (Español, English), following the WAI-ARIA tabs
  pattern of `AccessTabs` and reusing its styles; shared fields sit below, outside the tabs.
- A tab whose fields have problems says so in its label (`English · 2 por revisar`), and trying to
  save opens the first tab with a problem and focuses its first invalid field. Errors are linked to
  their field with `aria-describedby`.
- A one-sided change shows, under the other language's field, an explanation and a switch
  ("El título en inglés sigue siendo correcto"); the switch resets as soon as either language of
  that field changes again.
- A legacy record opens with its base text on the Spanish tab, flagged as possibly not Spanish, and
  an empty English tab (`English · Sin traducción`). In edit mode its card says the English version
  is missing.
- The explorer sends both languages only when a title or abstract changed; otherwise it sends just
  the shared fields that changed, always with the version taken when the editor opened. Server
  errors appear under their field and language; a conflict keeps what was typed and offers to
  close and reload instead of retrying over someone else's change.

#### Tests

- `app/lib/publications.test.ts`, `app/lib/publication-form.test.ts`: persistence (with a mocked
  Prisma client), schemas, the review rule, request bodies and error mapping.
- `app/api/publicaciones/**/route.test.ts`: the HTTP contract, every status code above.
- `app/components/public/publications/*.test.tsx`: tabs, validation, review switches, legacy
  records, server errors and the save flow.
- `tests/e2e/publications-i18n.spec.ts`: language switch and reload, create, shared-field edit of a
  legacy record, cross-language confirmation, concurrent edit, delete with cascade, axe checks in
  English and in the editor, and the editor from 320px to 1440px.

#### How this differs from the original design

- The original design had `PATCH` take an optional `locale` and write one language per request. The
  POC requires both languages in the same request instead, so they are always saved together and
  the cross-language review can be enforced by the server.
- The rollout started with publications rather than news.

### Known limitations of the POC

- Only publications are translated. The page's fixed copy, and every other entity, are not.
- Search on `/publicaciones` matches the text in the current language only.
- An editor receives both languages of every publication with the page, which doubles that payload.
- The English texts are written by editors; nothing is translated automatically and the existing
  publications have no English version until someone adds one.
- Publications have no language-specific URL or `hreflang` (the language is a cookie; see above).
- Deleting does not check the version: a delete wins over a concurrent edit, which then gets `404`.

### Design for the other entities (not built yet)

The same shape applies to `News`, `ResearchArea`, `NosotrosActivity`, `Researcher`,
`NosotrosResearcher`, `GalleryAlbum` and `GalleryMedia`: an `<Entity>Translation` table with the
translatable columns only (`title`, `abstract`, `description`, `paragraph`, `role`, `altText`,
`yearsLabel`), the base table keeping Spanish, and the publications code as the reference for
reading, writing, concurrency and the editor. Each one updates
[`database-definition.md`](database-definition.md) in the same PR.

Alternatives considered and rejected:

- **JSON columns** (`title: { es, en }`): changes the type of every existing column, breaks the
  SQLAlchemy mirror, and loses column constraints.
- **One generic table** (`entity`, `entity_id`, `field`, `locale`, `value`): no foreign keys, no
  typing, and every read becomes a pivot.

### What stays untranslated

- Worker output. It stores codes (satellite, channel, product); their labels are UI strings.
- Job payloads in `packages/contracts`. They carry no user-facing text and must stay that way.
- What a user typed about themselves (`fullName`, `institution`).
