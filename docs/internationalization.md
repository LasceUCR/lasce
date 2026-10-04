# Internationalization (i18n)

How the web app renders in more than one language, how to add a string or a language, and how
database content will be translated later. This covers `apps/web` only: the worker produces codes,
never text a visitor reads.

## State of things

- The mechanism is in place and **Spanish (`es`) is the source language**. English (`en`) exists
  as the second language.
- Only the **site shell** reads from the message catalogues so far: the header navigation, the
  footer, the skip link, the root page title and description, and the language switcher.
- Everything else is still hardcoded Spanish and shows in Spanish in every language. Moving it is
  the [migration backlog](#migration-backlog) below, page by page.
- Database content ("Modo edición") is not translated. The design for it is in
  [Dynamic content](#dynamic-content-design-not-built-yet).

## How it works

The library is [`next-intl`](https://next-intl.dev), set up **without locale routing**: the
language is not part of the URL.

| Piece                                        | Role                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------ |
| `apps/web/messages/<locale>.json`            | One catalogue per language. `es.json` defines the keys                         |
| `apps/web/app/lib/i18n/config.ts`            | `locales`, `defaultLocale`, `localeLabels`, the cookie name, the time zone     |
| `apps/web/app/lib/i18n/locale.ts`            | `resolveLocale(cookieValue)`: a supported locale, or Spanish                   |
| `apps/web/app/lib/i18n/messages.ts`          | `getMessages(locale)`: the catalogue, with Spanish filling untranslated keys   |
| `apps/web/app/lib/i18n/request.ts`           | Per-request config for next-intl, registered in `next.config.ts`               |
| `apps/web/app/lib/i18n/actions.ts`           | `setLocale`, the Server Action behind the language switcher                    |
| `apps/web/app/lib/i18n/testing.tsx`          | `renderWithIntl` for component tests                                           |
| `apps/web/global.d.ts`                       | Types `t()` keys against `es.json`                                             |
| `apps/web/app/layout.tsx`                    | Sets `<html lang>` and mounts `NextIntlClientProvider`                         |
| `app/components/public/LanguageSwitcher.tsx` | The control, rendered by `PublicHeader` in the desktop bar and the mobile menu |

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

**Content built on the server and passed as props** (`app/lib/footer.ts`). This is the pattern for
the `*Content` and `*Copy` objects in `app/lib/`: the constant becomes a function of the
translator, and the component stays presentational.

```tsx
export function getFooterContent(t: (key: FooterMessageKey) => string): PublicFooterContent

const footerT = await getTranslations('footer')
<PublicFooter content={getFooterContent((key) => footerT(key))} />
```

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
- Use ICU arguments for values, `"greeting": "Hola, {name}"`, never string concatenation: word
  order differs between languages.
- Keep `PascalCase.tsx` components presentational. `useTranslations` is fine for a component's
  own fixed UI text; content still arrives through props.

## Add a language

1. Add its code to `locales` and its own name to `localeLabels` in `app/lib/i18n/config.ts`.
2. Create `apps/web/messages/<code>.json`. It can start as `{}`.
3. Register it in `translations` in `app/lib/i18n/messages.ts`, and add it to the `test.each` list
   in `messages.test.ts`.

TypeScript reports steps 1 and 3 if either is skipped. The language switcher, the Storybook
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

## Migration backlog

Not done yet, in suggested order. Each item is independent.

1. **Page copy.** Inline JSX strings and the `*Meta`, `*Content`, `*Copy`, `*Messages` and
   `*Labels` exports in `app/lib/` (about 27). Per-page `metadata` exports become
   `generateMetadata`. Long structured content (`gallery.ts`, `academic-activities.ts`,
   `collaborations.ts`, `rosac.ts`) is the exception: see the table in the next section.
2. **Account menu and brand.** `accountMenuCopy` in `app/lib/auth/account.ts` ("Ingresar",
   "Mi cuenta") and the logo alt texts in `Brand.tsx` are part of the header but still Spanish.
3. **Formatting.** Nine `Intl.*` calls hardcode `'es-CR'` or `'es'` (dates and numbers in
   `scientific-data/`, `lib/news.ts`, `cuenta/page.tsx`, `lib/auth/countries.ts`,
   `services/downloads/exporters/png.ts`, `UserRoleChangeDialog.tsx`). Replace them with
   next-intl's `useFormatter` / `getFormatter`, which follow the request's locale and time zone.
4. **Validation and errors.** Zod schemas with inline Spanish messages (`lib/news.ts`,
   `lib/nosotros.ts`, `lib/auth/login.ts`, ...) become factories that take `t`. Server Actions and
   route handlers under `app/api/` call `getTranslations`; the cookie is available in both.
5. **Administration panel.** `lib/admin-sections.ts` and the components under
   `components/administracion/`.

## Dynamic content (design, not built yet)

Three kinds of text need three treatments:

| Kind                              | Examples                                                                    | Where the translations live                |
| --------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------ |
| UI strings                        | Buttons, labels, errors                                                     | Message catalogues (above)                 |
| Long static content in code       | `lib/gallery.ts`, `academic-activities.ts`, `collaborations.ts`, `rosac.ts` | One content module per language, see below |
| Database content ("Modo edición") | News, publications, research areas, activities, researchers, gallery        | A translation table per entity, see below  |

### Long static content

These modules hold hundreds of lines of structured content, too much for a flat catalogue. Each
keeps its Spanish module and gains a sibling per language, behind one function:

```ts
// app/lib/gallery/index.ts
export function getGalleryAlbums(locale: Locale): GalleryAlbum[]
```

Slugs, image paths and ids come from the Spanish module; a language module only overrides text,
and anything it lacks falls back to Spanish. Pages pass `await getLocale()`.

### Database content: a translation table per entity

```prisma
model NewsTranslation {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  newsId    String   @db.Uuid
  locale    String   @db.VarChar(5)
  title     String
  abstract  String   @db.Text
  imageAlt  String?
  updatedAt DateTime @default(now()) @updatedAt @db.Timestamptz(3)
  news      News     @relation(fields: [newsId], references: [id], onDelete: Cascade)

  @@unique([newsId, locale])
  @@map("news_record_translations")
  @@schema("news")
}
```

- **The base table keeps its Spanish columns**, as the source text and the fallback. Existing
  rows, seeds and the worker's SQLAlchemy mirror stay valid, and there is no data migration.
- Only translatable columns are repeated: `title`, `abstract`, `description`, `paragraph`, `role`,
  `altText`, `yearsLabel`. Proper nouns (`Publisher.name`, author and researcher names) are not.
- `locale` is a string validated against `locales` in the app, so a new language needs no
  migration.
- It follows the rules in [`database-definition.md`](database-definition.md): `gen_random_uuid()`
  ids, `@updatedAt` with `@default(now())`, Prisma as the only migration source.

Entities that would get one: `News`, `Research`, `ResearchArea`, `NosotrosActivity`, `Researcher`,
`NosotrosResearcher`, `GalleryAlbum`, `GalleryMedia`.

Alternatives considered and rejected:

- **JSON columns** (`title: { es, en }`): changes the type of every existing column, breaks the
  SQLAlchemy mirror, and loses column constraints.
- **One generic table** (`entity`, `entity_id`, `field`, `locale`, `value`): no foreign keys, no
  typing, and every read becomes a pivot.

Reading, writing and editing:

- **Read.** The lib functions take the locale, `getNews(locale)`. They include the translation
  row for that locale and overlay it field by field on the base row.
- **Write.** The existing `PATCH /api/<entity>/[id]` routes accept an optional `locale`. Absent or
  `es` writes the base row as today; another locale upserts the translation row. The permission
  stays `edit_components`.
- **Editor.** The `Editable<X>Card` forms get a language tab. A tab other than Spanish shows the
  Spanish text for reference and marks a row with no translation yet.
- **Rollout.** One entity first (`News`), then the others reuse the pattern. Each one updates
  `database-definition.md` in the same PR.

### What stays untranslated

- Worker output. It stores codes (satellite, channel, product); their labels are UI strings.
- Job payloads in `packages/contracts`. They carry no user-facing text and must stay that way.
- What a user typed about themselves (`fullName`, `institution`).
