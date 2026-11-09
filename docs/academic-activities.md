# Academic activities

How academic activities are presented and edited: a teaser section on `/noticias` and their own
dedicated, CMS-editable list at `/actividades-academicas`, both rendering the same card. There is
no separate detail page — the full write-up lives in the card itself, behind a "Leer más" toggle.
Academic activities represent workshops, seminars, courses and conferences organized or
co-organized by LASCE. Content lives in Postgres (`AcademicActivity`, schema `news`) and is edited
behind "Modo edición" the same way as Nosotros activities or research areas — see
[`add-a-cms-feature.md`](add-a-cms-feature.md) for the shared building blocks this reuses.

## The shape

```
/noticias                                         NewsPage                  h1 "Noticias"
  └─ AcademicActivitiesSection                    section.news-academic…    h2 "Actividades académicas"
       └─ ul.news-list › li                       one card per row, read-only
            └─ AcademicActivityCard               article, named by its h3
                 ├─ MediaFrame                    photograph, cover
                 └─ content                       category badge, h3 title, date/location,
                                                  full description, clamped via TruncatedText

/actividades-academicas                           AcademicActivitiesPage    article.topic-page
  ├─ TopicHero                                    kicker "Portal público LASCE"
  ├─ AddItemCard                                  "Agregar actividad", edit mode + create grant only
  └─ .academic-activities-list
       └─ EditableAcademicActivityCard            per activity: plain card, or wrapped in
            ├─ AcademicActivityCard                 EditableWrapper + edit Modal when edit mode is
            └─ EditableWrapper + Modal(              on and the account has edit or delete grants
                 AcademicActivityForm)
  └─ .topic-page-footer                           TopicBackLink "Volver al inicio"
```

Both the `/noticias` teaser and the dedicated `/actividades-academicas` list render the same
`AcademicActivityCard` — there is no detail route for either surface to link to. Only the
dedicated list page carries the CMS affordances; the `/noticias` teaser
(`AcademicActivitiesSection`) stays read-only, same as before.
`/actividades-academicas` is also reachable from the main nav, inside the `Divulgación` dropdown
next to Noticias and Galería (`PublicHeader.tsx`, `nav.academicActivities`).

| Piece                   | File                                                          | Covered by                              |
| ----------------------- | ------------------------------------------------------------- | --------------------------------------- |
| Client-safe schema      | `app/lib/academic-activities-schema.ts`                       | `app/lib/academic-activities.test.ts`   |
| Editing/form logic      | `app/lib/academic-activities-form.ts`                         | exercised through the form's tests      |
| Data and CRUD           | `app/lib/academic-activities.ts`                              | `app/lib/academic-activities.test.ts`   |
| Section on news         | `app/components/public/news/AcademicActivitiesSection.tsx`    | `AcademicActivitiesSection.test.tsx`    |
| Activity card           | `app/components/public/news/AcademicActivityCard.tsx`         | `AcademicActivityCard.test.tsx`         |
| Edit/delete affordances | `app/components/public/news/EditableAcademicActivityCard.tsx` | `EditableAcademicActivityCard.test.tsx` |
| Create/edit form        | `app/components/public/news/AcademicActivityForm.tsx`         | `AcademicActivityForm.test.tsx`         |
| Image upload action     | `app/(public)/actividades-academicas/actions.ts`              | exercised through the form's tests      |
| Dedicated list page     | `app/components/public/news/AcademicActivitiesPage.tsx`       | `AcademicActivitiesPage.test.tsx`       |
| List route              | `app/(public)/actividades-academicas/page.tsx`                | `tests/e2e/public-portal.spec.ts`       |
| Read/write API          | `app/api/academic-activities/route.ts`, `[id]/route.ts`       | `route.test.ts` next to each            |
| Sitemap & SEO           | `app/lib/site.ts`                                             | `tests/e2e/accessibility-seo.spec.ts`   |

## Data model

`AcademicActivity` (`packages/db/prisma/schema.prisma`, `@@schema("news")`, table
`academic_activities`) is bilingual, following the shared pattern in
[`translate-database-content.md`](translate-database-content.md): `title`, `category`,
`description` and `photoAlt` are translatable, each written once per language; `startDate`,
`endDate`, `location` and `photoUrl` are shared and written once. The Spanish text for a new
activity stays on the base row; every other language lives in `AcademicActivityTranslation`
(table `academic_activity_translations`, one row per `(academic_activity_id, locale)`). An
activity created before translations existed has no translation row and is legacy: its base
text's language is unknown until an editor saves it in every language. Every field is required
except `endDate`; there is no draft state, an activity is either fully filled in or not created
yet. `id` is a Postgres UUID and doubles as the card's stable identifier.

[`apps/web/app/lib/academic-activities-schema.ts`](../apps/web/app/lib/academic-activities-schema.ts)
defines the translatable fields (`academicActivityContent`, via `defineTranslatableContent`) and
the create/update Zod schemas; it is client-safe, imported by both the API routes and the form.
[`apps/web/app/lib/academic-activities.ts`](../apps/web/app/lib/academic-activities.ts) is the
server-only data access layer and exposes the read model the UI renders:

```typescript
export interface AcademicActivity {
  id: string
  title: string
  category: string
  /** Display string: a single date or a "16-20 febrero, 2026" range. */
  date: string
  /** Raw `yyyy-mm-dd`, what the edit form needs; `date` is display-only and doesn't round-trip. */
  startDate: string
  endDate: string | null
  location: string
  description: string
  photoUrl: string
  photoAlt: string
  /** The language `title`/`category`/`description`/`photoAlt` are actually in; `null` if legacy. */
  contentLocale?: Locale | null
  /** Present only when loaded with `includeEditingData`: both languages and the save version. */
  editing?: AcademicActivityEditingData
}
```

`getAcademicActivities(locale, { includeEditingData })` loads every row from Postgres, most
recent `startDate` first, resolving the translatable fields to `locale` (falling back to the base
text for a legacy activity). `includeEditingData` must be `true` only for someone who can edit —
`actividades-academicas/page.tsx` passes `canEdit` — since it sends every language to the
browser. `createAcademicActivity` writes the base row and every translation row in one
transaction; `updateAcademicActivity` is optimistic-concurrency-checked against
`editing.version` (`modifiedAt`), rejects a one-sided language change unless the other language is
also changed or explicitly confirmed (`confirmedUnchanged`, the shared cross-language review
rule), and leaves the text and translations untouched for a shared-field-only update (dates,
location or photo alone). `category` is free text, not an enum — "Taller"/"Workshop",
"Charla"/"Talk" and so on are editorial categories an admin types, in each language, not a fixed
set the system enforces.

## Layout and components

### Card (`AcademicActivityCard`)

Reuses the `.news-card` layout to ensure visual consistency with standard news entries:

- Desktop (> 1120px): 280px photo column, text padded 20px 22px, minimum height 190px.
- Mobile (≤ 700px): Stacked layout with 200px photo banner on top.
- Includes a category badge (`.academic-activity-category`) and metadata (date and location).
- The full `description` is clamped to 3 lines through the shared `TruncatedText` component
  (`apps/web/app/components/public/TruncatedText.tsx`, see
  [`truncated-text.md`](truncated-text.md)), with its default "Leer más"/"Leer menos" toggle — the
  same standard `ResearchAreaCard` uses. There is no action button in the card: the write-up is
  the whole point of it, not a summary pointing elsewhere.

### Editing (`EditableAcademicActivityCard`, `AcademicActivityForm`)

`EditableAcademicActivityCard` is the one component that knows both `AcademicActivity` and
`useEditMode()` — it renders the plain `AcademicActivityCard` when edit mode is off, and wraps it
in `EditableWrapper` plus an edit `Modal` (holding `AcademicActivityForm`) when edit mode is on and
the account has `edit_components` or `delete_components`. `AcademicActivitiesPage` owns the list,
an `AddItemCard` (shown with `create_components`), and the `useRequestFeedback` calls to
`/api/academic-activities` — the same shape as `NewsExplorer`/`EditableNewsCard`.

`AcademicActivityForm` follows the bilingual CMS form convention (`NewsArticleForm`/`MediaForm` are
its closest siblings): `title`, `category`, `description` and `photoAlt` sit behind `LanguageTabs`,
one tab per language, validated through the shared content core
(`app/lib/i18n/content/form.ts`, configured by `academicActivityContent`); `startDate`, `endDate`,
`location` and the photo stay outside the tabs. A field changed in one language only is flagged by
`TranslationReview`, asking the editor to update the other language's text too or confirm it is
still correct — `app/lib/academic-activities-form.ts` carries this logic (drafts, change
detection, the request bodies) free of React, shared by the form and `AcademicActivitiesPage`. A
`StandardConfirmDialog` guards an unsaved discard. All of the form's own copy — field labels,
placeholders, buttons and dialogs — comes from the `academicActivities.editor`/`.validation`/
`.discardDialog` message namespaces, following the site's language like every other CMS form; the
field nouns used in the shared validation messages ("El título en español...", "The English
category...") come from `academicActivityContent`'s own definition. The image itself is uploaded
through `uploadAcademicActivityImage` (`app/(public)/actividades-academicas/actions.ts`), a
`'use server'` action that requires either `create_components` or `edit_components` and returns
the asset's permanent public URL — the same pattern `uploadResearchAreaImage`/`uploadInstrumentImage`
use; a required, separate "texto alternativo" field holds the image's alt text (translatable, one
per language) instead of the shared fields.

`endDate`, when given, cannot be earlier than `startDate`. On create, `academicActivityCreateSchema`
(`app/lib/academic-activities-schema.ts`) rejects that with a `.refine()` attached to the `endDate`
path. On update the two dates always travel together in the request — sending one without the
other is itself a validation error — so the range can be checked the same way without reading the
row already on the server; the form mirrors the same check client-side, showing the error under
the end-date field instead of only after a round trip to the server.

`AcademicActivityForm` takes a `busy` prop, set by `AcademicActivitiesPage`'s `send()` wrapper
while a create, update or delete request is in flight (the same `pending.current` ref plus `busy`
state pattern `NewsExplorer` uses): the whole field set is disabled and the submit button reads
"Guardando…"/"Saving…", so a second click while the request is pending cannot send a duplicate
request.

### Dedicated list page (`AcademicActivitiesPage`)

The `/actividades-academicas` screen, following the same standard every other top-level topic page
uses: `TopicHero` (kicker "Portal público LASCE", title and lead from the
`academicActivities.listPage` message namespace), then a debounced search field, the result summary,
the create affordance (edit mode only), and one `EditableAcademicActivityCard` per activity — no
second, duplicate section heading the way `/noticias`' teaser has one. The search accepts text from
the displayed title, category, description, location, or the localized date range;
the database query searches only the requested 10-item page and includes the English translation
when English is selected. An empty search result shows `academicActivities.listPage.emptyQuery`;
an empty catalogue shows `academicActivities.section.empty`. `?q=` and `?page=` are canonicalized
to the trimmed query and an in-range page, and changing the query returns to page 1. Pagination
links preserve the query and browser history. `TopicBackLink` returns to `/`.

## Permissions

CMS permissions are global, not per-feature: `create_components`, `edit_components` and
`delete_components` (`app/lib/auth/permissions.ts`) are shared across every CMS surface (News,
Nosotros, ResearchArea, Rosac, and this one) — there is no activity-specific permission key.

## Skeleton loading states

While academic activities are being retrieved on an uncached visit (#410), both the dedicated list
at `/actividades-academicas` (`AcademicActivitiesPage`) and the teaser on `/noticias`
(`AcademicActivitiesSection`) display skeleton placeholders shaped like the activity cards,
preventing empty areas or noticeable layout shifts:

- **Placeholders**: `AcademicActivityCardSkeleton` follows the `.news-card` metrics (280px photo
  column with min-height 190px on desktop; 200px stacked photo banner on mobile `<= 700px`),
  category badge, title, metadata line, and clamped description lines.
  `AcademicActivitiesListSkeleton` renders multiple card placeholders inside
  `.academic-activities-list`.
- **Loading region & accessibility**: Built on `LoadingRegion`, which marks the list area
  `aria-busy="true"`, announces the loading state politely to assistive technologies ("Cargando
  actividades académicas…" / "Loading academic activities…"), and marks all placeholder markup
  `aria-hidden="true"` and `inert`.
- **Transitions**: When loading finishes, placeholders are replaced by the loaded cards, the
  empty state (`academicActivities.section.empty`), or an error notice (`Notice tone="error"`).
- **Reduced motion**: Shimmer animations stop under `prefers-reduced-motion: reduce`.

## Sitemap and SEO

`/actividades-academicas` is listed in `publicPaths` (`app/lib/site.ts`), ensuring it is included
in `sitemap.xml` and audited by Playwright's automated accessibility and SEO checks.
