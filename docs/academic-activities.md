# Academic activities

How academic activities are presented on `/noticias` and their detail pages at
`/noticias/actividades/[slug]`. Academic activities represent workshops, seminars, and conferences
organized or co-organized by LASCE.

## The shape

```
/noticias                                         NewsPage                  h1 "Noticias"
  └─ AcademicActivitiesSection                    section.news-academic…    h2 "Actividades académicas"
       └─ ul.news-list › li                       one card per row
            └─ AcademicActivityCard               article, named by its h3
                 ├─ MediaFrame                    photograph, cover
                 └─ content                       category badge, h3 title, date/location,
                                                  clamped abstract, "Ver detalles de la actividad"
/noticias/actividades/[slug]                      AcademicActivityPage      article.topic-page
  ├─ TopicHero                                    kicker "Actividad académica", lead = abstract
  ├─ TopicSection "Información general"           h2 + CardGrid (3 columns)
  │    ├─ InfoCard "Tipo de actividad"            GraduationCap icon
  │    ├─ InfoCard "Fecha"                        Calendar icon
  │    └─ InfoCard "Lugar"                        MapPin icon
  ├─ TopicSection "Descripción de la actividad"   h2 + p.topic-intro
  ├─ TopicSection "Recursos y enlaces de interés" h2 + Button actions (optional)
  └─ .topic-page-footer                           TopicBackLink "Volver a noticias"
```

| Piece            | File                                                       | Covered by                            |
| ---------------- | ---------------------------------------------------------- | ------------------------------------- |
| Data and helpers | `app/lib/academic-activities.ts`                           | `app/lib/academic-activities.test.ts` |
| Section on news  | `app/components/public/news/AcademicActivitiesSection.tsx` | `AcademicActivitiesSection.test.tsx`  |
| Activity card    | `app/components/public/news/AcademicActivityCard.tsx`      | `AcademicActivityCard.test.tsx`       |
| Detail page      | `app/components/public/news/AcademicActivityPage.tsx`      | `AcademicActivityPage.test.tsx`       |
| Detail route     | `app/(public)/noticias/actividades/[slug]/page.tsx`        | `tests/e2e/public-portal.spec.ts`     |
| Sitemap & SEO    | `app/lib/site.ts`                                          | `tests/e2e/accessibility-seo.spec.ts` |

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

### Detail page (`AcademicActivityPage`)

Follows the platform's standard design system (`article.topic-page`):

- `TopicHero`: Displays the kicker, activity title, and abstract as the lead text.
- `TopicSection` for general metadata: Uses `CardGrid` with 3 columns and `InfoCard` items with Lucide icons (`GraduationCap`, `Calendar`, `MapPin`).
- `TopicSection` for description: Renders paragraphs using `.topic-intro` typography.
- `TopicSection` for resources: Optional section rendering action buttons (e.g. linking to related gallery albums).
- Symmetrical vertical spacing: The gap below the resources button matches the 36px inter-section spacing between description and resources.
- `TopicBackLink`: Secondary navigation button returning to `/noticias`.

## Routing, Sitemap and SEO

- **Static generation**: The dynamic route `app/(public)/noticias/actividades/[slug]/page.tsx` exports `dynamicParams = false` and pre-renders all activity pages at build time using `generateStaticParams()`.
- **Metadata**: Each activity page generates dynamic title (`${activity.title} | Noticias | LASCE`) and description from its abstract.
- **Sitemap**: Slugs from `academicActivitySlugs` are mapped to `/noticias/actividades/${slug}` in `publicPaths` (`app/lib/site.ts`), ensuring every activity is included in `sitemap.xml` and audited by Playwright automated accessibility and SEO checks.
