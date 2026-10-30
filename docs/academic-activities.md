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
`academic_activities`) is single-language, unlike the bilingual `Research`/`News` records — there
is no translation table. Every field is required except `endDate`; there is no draft state, an
activity is either fully filled in or not created yet. `id` is a Postgres UUID and doubles as the
card's stable identifier.

[`apps/web/app/lib/academic-activities.ts`](../apps/web/app/lib/academic-activities.ts) exposes
the read model the UI renders:

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
}
```

`getAcademicActivities()` loads every row from Postgres, most recent `startDate` first.
`createAcademicActivity`/`updateAcademicActivity`/`deleteAcademicActivity` are the CRUD functions
the API routes call; `academicActivityInputSchema` (zod) is shared by both create and update, and
by the form's own client-side validation, so a rejection reads the same whether it is caught in
the browser or by the server. `category` is free text, not an enum — "Taller", "Charla", "Curso",
"Conferencia" and so on are editorial categories an admin types, not a fixed set the system
enforces.

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

`AcademicActivityForm` follows the standard CMS form conventions: every field required except the
end date, validated on blur and on submit attempt (`FormField`'s `validate`), a required
`FileDropInput` for the photo plus a required, separate "texto alternativo" field (same shape as
`RosacInstrumentForm`'s image field), and a `StandardConfirmDialog` guarding an unsaved discard.
The image itself is uploaded through `uploadAcademicActivityImage`
(`app/(public)/actividades-academicas/actions.ts`), a `'use server'` action that requires either
`create_components` or `edit_components` and returns the asset's permanent public URL — the same
pattern `uploadResearchAreaImage`/`uploadInstrumentImage` use.

### Dedicated list page (`AcademicActivitiesPage`)

The `/actividades-academicas` screen, following the same standard every other top-level topic page
uses: `TopicHero` (kicker "Portal público LASCE", title and lead from the
`academicActivities.listPage` message namespace) followed by the create affordance (edit mode
only) and one `EditableAcademicActivityCard` per activity — no second, duplicate section heading
the way `/noticias`' teaser has one. An empty list with no create grant shows
`academicActivities.section.empty` instead. `TopicBackLink` returns to `/`.

## Permissions

CMS permissions are global, not per-feature: `create_components`, `edit_components` and
`delete_components` (`app/lib/auth/permissions.ts`) are shared across every CMS surface (News,
Nosotros, ResearchArea, Rosac, and this one) — there is no activity-specific permission key.

## Sitemap and SEO

`/actividades-academicas` is listed in `publicPaths` (`app/lib/site.ts`), ensuring it is included
in `sitemap.xml` and audited by Playwright's automated accessibility and SEO checks.
