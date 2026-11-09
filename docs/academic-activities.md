# Academic activities

Academic activities are presented exclusively in their dedicated list at `/actividades-academicas`.
They are not included in `/noticias` or its management controls. There is no separate detail page
— the full write-up lives in the card itself, behind a "Leer más" toggle. Academic activities
represent workshops, seminars, and conferences organized or co-organized by LASCE.

## The shape

```
/actividades-academicas                           AcademicActivitiesPage    article.topic-page
  ├─ TopicHero                                    kicker "Portal público LASCE"
  ├─ .academic-activities-list › AcademicActivityCard   one card per activity
  │    └─ photograph, category, h3 title, date/location, full description via TruncatedText
  └─ .topic-page-footer                           TopicBackLink "Volver al inicio"
```

`/actividades-academicas` is also reachable from the main nav, inside the `Divulgación` dropdown
next to Noticias and Galería (`PublicHeader.tsx`, `nav.academicActivities`).

News is read and managed through `news.news_records` and `/api/news`; academic activities use
the content below. Removing the former news teaser changes no records, translations, images or
activity descriptions and requires no database migration.

| Piece               | File                                                    | Covered by                            |
| ------------------- | ------------------------------------------------------- | ------------------------------------- |
| Data and helpers    | `app/lib/academic-activities.ts`                        | `app/lib/academic-activities.test.ts` |
| Activity card       | `app/components/public/news/AcademicActivityCard.tsx`   | `AcademicActivityCard.test.tsx`       |
| Dedicated list page | `app/components/public/news/AcademicActivitiesPage.tsx` | `AcademicActivitiesPage.test.tsx`     |
| List route          | `app/(public)/actividades-academicas/page.tsx`          | `tests/e2e/public-portal.spec.ts`     |
| Sitemap & SEO       | `app/lib/site.ts`                                       | `tests/e2e/accessibility-seo.spec.ts` |

## Data model

The content is defined in [`apps/web/app/lib/academic-activities.ts`](../apps/web/app/lib/academic-activities.ts):

```typescript
export interface AcademicActivity {
  slug: string
  title: string
  category: string
  date: string
  location?: string
  description: string
  imageUrl: string
  imageAlt: string
}
```

`getAcademicActivities(messages)` returns every activity, described in the language of `messages`
(defaults to Spanish, the source language). `academicActivities` is the Spanish fixture, used by
stories and tests.

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

### Dedicated list page (`AcademicActivitiesPage`)

The `/actividades-academicas` screen, following the same standard every other top-level topic page
uses: `TopicHero` (kicker "Portal público LASCE", title and lead from the
`academicActivities.listPage` message namespace) followed directly by one `AcademicActivityCard`
per activity, without a second, duplicate section heading. An empty
list shows `academicActivities.section.empty` instead. `TopicBackLink` returns to `/`.

## Skeleton loading states

While academic activities are being retrieved on an uncached visit (#410), the dedicated list
at `/actividades-academicas` (`AcademicActivitiesPage`) displays skeleton placeholders shaped like the activity cards,
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
The sitemap does not advertise the obsolete `/noticias/actividades/*` detail URLs.
