# Academic activities

How academic activities are presented: a teaser section on `/noticias`, their own dedicated list
at `/actividades-academicas`, and detail pages at `/actividades-academicas/[slug]` — the one and
only detail route either surface links to. Academic activities represent workshops, seminars, and
conferences organized or co-organized by LASCE.

## The shape

```
/noticias                                         NewsPage                  h1 "Noticias"
  └─ AcademicActivitiesSection                    section.news-academic…    h2 "Actividades académicas"
       └─ ul.news-list › li                       one card per row
            └─ AcademicActivityCard               article, named by its h3
                 ├─ MediaFrame                    photograph, cover
                 └─ content                       category badge, h3 title, date/location,
                                                  clamped abstract, "Ver detalles de la actividad"

/actividades-academicas                           AcademicActivitiesPage    article.topic-page
  ├─ TopicHero                                    kicker "Portal público LASCE"
  ├─ .academic-activities-list › AcademicActivityCard   same card the `/noticias` teaser uses
  └─ .topic-page-footer                           TopicBackLink "Volver al inicio"

/actividades-academicas/[slug]                    AcademicActivityPage      article.topic-page
  ├─ TopicHero                                    kicker "Actividad académica", lead = abstract
  ├─ TopicSection "Información general"           h2 + CardGrid (3 columns)
  │    ├─ InfoCard "Tipo de actividad"            GraduationCap icon
  │    ├─ InfoCard "Fecha"                        Calendar icon
  │    └─ InfoCard "Lugar"                        MapPin icon
  ├─ TopicSection "Descripción de la actividad"   h2 + p.topic-intro
  ├─ TopicSection "Recursos y enlaces de interés" h2 + Button actions (optional)
  └─ .topic-page-footer                           TopicBackLink "Volver a actividades académicas"
```

Both the `/noticias` teaser and the dedicated `/actividades-academicas` list render the same
`AcademicActivityCard`, and both link to the same `/actividades-academicas/[slug]` detail route —
there is no separate detail page nested under `/noticias` anymore. `/actividades-academicas` is
also a top-level entry in the main nav bar (`PublicHeader.tsx`, `nav.academicActivities`).

| Piece                 | File                                                          | Covered by                             |
| --------------------- | -------------------------------------------------------------- | --------------------------------------- |
| Data and helpers      | `app/lib/academic-activities.ts`                                | `app/lib/academic-activities.test.ts`  |
| Section on news       | `app/components/public/news/AcademicActivitiesSection.tsx`      | `AcademicActivitiesSection.test.tsx`   |
| Activity card         | `app/components/public/news/AcademicActivityCard.tsx`           | `AcademicActivityCard.test.tsx`        |
| Dedicated list page   | `app/components/public/news/AcademicActivitiesPage.tsx`         | `AcademicActivitiesPage.test.tsx`      |
| List route            | `app/(public)/actividades-academicas/page.tsx`                  | `tests/e2e/public-portal.spec.ts`      |
| Detail page           | `app/components/public/news/AcademicActivityPage.tsx`           | `AcademicActivityPage.test.tsx`        |
| Detail route          | `app/(public)/actividades-academicas/[slug]/page.tsx`           | `tests/e2e/public-portal.spec.ts`      |
| Sitemap & SEO         | `app/lib/site.ts`                                                | `tests/e2e/accessibility-seo.spec.ts`  |

## Data model

The content is defined in [`apps/web/app/lib/academic-activities.ts`](../apps/web/app/lib/academic-activities.ts):

```typescript
export interface AcademicActivityResource {
  label: string
  href: string
}

export interface AcademicActivity {
  slug: string
  title: string
  category: string
  date: string
  location?: string
  abstract: string
  description: string
  imageUrl: string
  imageAlt: string
  resources?: AcademicActivityResource[]
}
```

Helper functions provide lookups and route params:

- `getAcademicActivities()`: Returns all activities.
- `getAcademicActivity(slug)`: Finds an activity by its slug.
- `academicActivitySlugs`: Array of slugs used by `generateStaticParams()` and sitemap generation.

## Layout and components

### Card (`AcademicActivityCard`)

Reuses the `.news-card` layout to ensure visual consistency with standard news entries:

- Desktop (> 1120px): 280px photo column, text padded 20px 22px, minimum height 190px.
- Mobile (≤ 700px): Stacked layout with 200px photo banner on top.
- Includes a category badge (`.academic-activity-category`) and metadata (date and location).
- Abstract is clamped to 3 lines via CSS.
- The action button is placed in `.news-card-footer` (`margin-top: auto`), aligning it to the bottom-right corner.

### Dedicated list page (`AcademicActivitiesPage`)

The `/actividades-academicas` screen, following the same standard every other top-level topic page
uses: `TopicHero` (kicker "Portal público LASCE", title and lead from the
`academicActivities.listPage` message namespace) followed directly by one `AcademicActivityCard`
per activity — no second, duplicate section heading the way `/noticias`' teaser has one. An empty
list shows `academicActivities.section.empty` instead. `TopicBackLink` returns to `/`.

### Detail page (`AcademicActivityPage`)

Follows the platform's standard design system (`article.topic-page`):

- `TopicHero`: Displays the kicker, activity title, and abstract as the lead text.
- `TopicSection` for general metadata: Uses `CardGrid` with 3 columns and `InfoCard` items with Lucide icons (`GraduationCap`, `Calendar`, `MapPin`).
- `TopicSection` for description: Renders paragraphs using `.topic-intro` typography.
- `TopicSection` for resources: Optional section rendering action buttons (e.g. linking to related gallery albums).
- Symmetrical vertical spacing: The gap below the resources button matches the 36px inter-section spacing between description and resources.
- `TopicBackLink`: Secondary navigation button returning to `/actividades-academicas` by default
  (`AcademicActivityPage`'s `backHref`/`backLabel` props can still override it).

## Routing, Sitemap and SEO

- **Static generation**: The dynamic route `app/(public)/actividades-academicas/[slug]/page.tsx` exports `dynamicParams = false` and pre-renders all activity pages at build time using `generateStaticParams()`.
- **Metadata**: The list page's metadata comes from `academicActivities.listPage` (`metaTitle`/`metaDescription`). Each activity page generates a dynamic title (`${activity.title} | Actividades académicas | LASCE`) and description from its abstract.
- **Sitemap**: `/actividades-academicas` and, for each slug in `academicActivitySlugs`, `/actividades-academicas/${slug}` are listed in `publicPaths` (`app/lib/site.ts`), ensuring every page is included in `sitemap.xml` and audited by Playwright automated accessibility and SEO checks.
