# Academic activities

How academic activities are presented: a teaser section on `/noticias` and their own dedicated
list at `/actividades-academicas`, both rendering the same card. There is no separate detail page
— the full write-up lives in the card itself, behind a "Leer más" toggle. Academic activities
represent workshops, seminars, and conferences organized or co-organized by LASCE.

## The shape

```
/noticias                                         NewsPage                  h1 "Noticias"
  └─ AcademicActivitiesSection                    section.news-academic…    h2 "Actividades académicas"
       └─ ul.news-list › li                       one card per row
            └─ AcademicActivityCard               article, named by its h3
                 ├─ MediaFrame                    photograph, cover
                 └─ content                       category badge, h3 title, date/location,
                                                  full description, clamped via TruncatedText

/actividades-academicas                           AcademicActivitiesPage    article.topic-page
  ├─ TopicHero                                    kicker "Portal público LASCE"
  ├─ .academic-activities-list › AcademicActivityCard   same card the `/noticias` teaser uses
  └─ .topic-page-footer                           TopicBackLink "Volver al inicio"
```

Both the `/noticias` teaser and the dedicated `/actividades-academicas` list render the same
`AcademicActivityCard` — there is no detail route for either surface to link to.
`/actividades-academicas` is also reachable from the main nav, inside the `Divulgación` dropdown
next to Noticias and Galería (`PublicHeader.tsx`, `nav.academicActivities`).

| Piece               | File                                                       | Covered by                            |
| ------------------- | ---------------------------------------------------------- | ------------------------------------- |
| Data and helpers    | `app/lib/academic-activities.ts`                           | `app/lib/academic-activities.test.ts` |
| Section on news     | `app/components/public/news/AcademicActivitiesSection.tsx` | `AcademicActivitiesSection.test.tsx`  |
| Activity card       | `app/components/public/news/AcademicActivityCard.tsx`      | `AcademicActivityCard.test.tsx`       |
| Dedicated list page | `app/components/public/news/AcademicActivitiesPage.tsx`    | `AcademicActivitiesPage.test.tsx`     |
| List route          | `app/(public)/actividades-academicas/page.tsx`             | `tests/e2e/public-portal.spec.ts`     |
| Sitemap & SEO       | `app/lib/site.ts`                                          | `tests/e2e/accessibility-seo.spec.ts` |

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
per activity — no second, duplicate section heading the way `/noticias`' teaser has one. An empty
list shows `academicActivities.section.empty` instead. `TopicBackLink` returns to `/`.

## Sitemap and SEO

`/actividades-academicas` is listed in `publicPaths` (`app/lib/site.ts`), ensuring it is included
in `sitemap.xml` and audited by Playwright's automated accessibility and SEO checks.
