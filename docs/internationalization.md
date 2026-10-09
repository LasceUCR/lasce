# Internationalization (i18n)

How the web app renders in more than one language and how to add a string or a language.
Translating database content is covered in its own guide,
[`translate-database-content.md`](translate-database-content.md). This covers `apps/web` only: the worker produces codes,
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
- Database content ("Modo edición") has shared, reusable infrastructure, and **one entity uses it:
  the publications on `/publicaciones`** (title and abstract, in Spanish and English). Every other
  editable entity is still single-language. See [Dynamic content](#dynamic-content) and
  [`translate-database-content.md`](translate-database-content.md).

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
7. **Database content** for every entity except publications, following
   [`translate-database-content.md`](translate-database-content.md).

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

### Database content

Editable content keeps Spanish on the entity's own table and every other language in a
translation table per entity (`<entity>_translations`), and is read in the language of the
`lasce_locale` cookie with a per-record fallback for records saved before the entity became
bilingual. Shared modules handle the schemas, the cross-language review, reading and fallback,
the editor's language tabs, transactions, optimistic concurrency and the API's error envelope.

- **How it works and how to make an entity bilingual:**
  [`translate-database-content.md`](translate-database-content.md), with the publications as the
  reference implementation, their API contract, the design decisions and the known limitations.
- **Which entities are bilingual:** publications only. The same pattern is meant for `News`,
  `ResearchArea`, `NosotrosActivity`, `Researcher`, `NosotrosResearcher`, `GalleryAlbum` and
  `GalleryMedia`, each with its own translation table holding only its translatable columns
  (`title`, `abstract`, `description`, `paragraph`, `role`, `altText`, `yearsLabel`).
- **Tables:** [`database-definition.md`](database-definition.md).

The editor's language tabs only choose which translation is being edited; the header selector
alone sets the language a visitor reads.

### What stays untranslated

- Worker output. It stores codes (satellite, channel, product); their labels are UI strings.
- Job payloads in `packages/contracts`. They carry no user-facing text and must stay that way.
- What a user typed about themselves (`fullName`, `institution`).
