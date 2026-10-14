# Collaborations and initiatives

How `/colaboraciones-e-iniciativas` is built. Partner organizations are read from PostgreSQL by
[`collaboration-records.ts`](../apps/web/app/lib/collaboration-records.ts). The route resolves
their country text using the visitor's `lasce_locale` cookie and the shared database-content
helpers. The ISWI and IVIA copy and the fixed interface text remain in `apps/web/messages/`;
[`collaborations.ts`](../apps/web/app/lib/collaborations.ts) keeps initiative structure, logos
and external URLs. Both Spanish and English are supported.

This is the public reading and persistence portion of LASCE-PUB-002. There is no collaboration
admin form or CRUD API in this branch. The static organization list in
[`research-collaborations.ts`](../apps/web/app/lib/research-collaborations.ts) is a fixture for
stories and tests, not a second public data source.

## Translation mapping

| Content                                                      | Source                                                                              | Localization                                                               |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Metadata, hero, section heading, description and empty state | `collaborations.meta`, `.hero`, `.section`                                          | Spanish/English catalogues                                                 |
| National/international badge and acronym label               | `collaborations.card`                                                               | Stable scope maps to a catalogue key                                       |
| Organization's country                                       | `research.collaborations.country` and `research.collaboration_translations.country` | Spanish base row, English translation keyed by collaboration id and locale |
| Official organization name, acronym, scope and display order | `research.collaborations`                                                           | Shared, never translated                                                   |
| Initiative title, paragraphs, logo alt text and link label   | `collaborations.initiatives`                                                        | Existing Spanish/English catalogues                                        |
| Initiative logo files and external URLs                      | `lib/collaborations.ts`                                                             | Shared, never translated                                                   |
| Back link label                                              | `common.backToHome`                                                                 | Spanish/English catalogues                                                 |

Country is the only translatable text field in the current organization card. There is no
organization description, logo or website field to translate; the existing logos and websites
belong to the initiatives. `collaborationContent` defines the country with
`defineTranslatableContent`, so a future editor can use the same bilingual validation and review
helpers as publications without treating official organization names as translated text.

The public query fetches the directory and its supported translations in one Prisma call and
preserves `position` order (with `id` as a stable tie-breaker). It exposes only resolved public
fields. Missing translation rows fall back to the base country via `storedContentFrom` and
`resolveContent`. As with publications, legacy base text has an unknown language, so only the
country span receives `lang=""`; translated countries receive `lang="es"` or `lang="en"`.
Fixed UI keys retain the catalogue's Spanish fallback. Switching languages re-renders the same
URL; neither organization identity nor classification depends on translated labels.

## Migration and validation

Apply `20261013120000_add_collaboration_translations` before running the updated page:

```bash
pnpm db:generate
pnpm db:migrate:deploy
```

The migration creates the two tables and copies the eight existing organizations, their order,
and their existing Spanish/English country labels in one transaction. No separate seed run is
needed. Translation rows are unique by `(collaboration_id, locale)` and are deleted with their
organization. Existing data in other tables is untouched. Prisma owns the migration; the worker
has matching SQLAlchemy models.

Tests cover localized reads, newly stored countries outside the old catalogue, legacy fallback,
stable classification and names, translated country accessibility, language switching and
responsive layouts. `tests/integration/collaborations.test.ts` also checks persisted updates,
translation uniqueness and cascade deletion on a disposable `*_test` database, following
[`translate-database-content.md`](translate-database-content.md). Browser coverage lives in
`tests/e2e/collaboration-language.spec.ts` and the collaboration case in
`tests/e2e/responsive-controls.spec.ts`.

Quiénes somos (`/nosotros`) no longer includes this material. Its header comment points here.

## The shape

```
/colaboraciones-e-iniciativas          page.tsx                 TopicHero h1
  ├─ ResearchCollaborationsSection     section.page-width       h2 "Colaboraciones de investigación"
  │    └─ .collaborations-grid         article.collaboration-card
  │         └─ CollaborationCard       h3 name, badge, country, siglas
  └─ TopicSection                      wide                     h2 initiatives title
       └─ .topic-initiative            one card per initiative
            ├─ logo                   img, real alt
            └─ .topic-initiative-copy h3, paragraphs, official-site button
```

| Piece                  | File                                                          | Covered by                                         |
| ---------------------- | ------------------------------------------------------------- | -------------------------------------------------- |
| Initiative copy        | `app/lib/collaborations.ts`                                   | `CollaborationsPage.test.tsx`                      |
| Partner organizations  | `app/lib/collaboration-records.ts`                            | `collaboration-records.test.ts`, integration tests |
| Route                  | `app/(public)/colaboraciones-e-iniciativas/page.tsx`          | `tests/e2e/public-portal.spec.ts`, axe sweep       |
| Page                   | `app/components/public/collaborations/CollaborationsPage.tsx` | `CollaborationsPage.test.tsx`                      |
| Organisation section   | `…/research/ResearchCollaborationsSection.tsx`                | `ResearchCollaborationsSection.test.tsx`           |
| One organization card  | `…/research/CollaborationCard.tsx`                            | `CollaborationCard.test.tsx`                       |
| Desktop and mobile nav | `app/components/public/PublicHeader.tsx`                      | `PublicHeader.test.tsx`, `accessibility-seo`       |

`publicPaths` in `app/lib/site.ts` lists `/colaboraciones-e-iniciativas` after `/nosotros`, so the
route is in the sitemap.

## Navigation

The desktop header and the mobile menu group the page with Quiénes somos under **Nosotros**,
the same disclosure pattern as **Recursos**. The group label is not itself a link. On mobile
it is an accordion that starts closed.

## Layout

**Organizations.** A grid of cards: four columns above 1080px, two columns down to 760px, one
column below that. Each card shows a "Nacional" or "Internacional" badge, the country, the
organization name as an `h3`, and the acronym when the entry has one. There is no search field
and no scope filter. An empty list renders the status text "No hay información de colaboraciones
disponible actualmente." `.research-collaborations` uses 8px of top padding so the heading sits
close to the hero lead.

**Initiatives.** One full-width card per item, 18px apart. With a logo the card is two columns:
a 240px logo column and the text. The logo scales to that column (`height: auto`). The copy is a
column; the official-site button sits at the end of it, on the right. Below 760px the card
stacks, the logo is 200px wide, and the button stays at the end of the text block. The button
uses `variant="brand"` and opens the official site in a new tab (`rel="noopener noreferrer"`).

## Editorial notes

The ISWI paragraph is the UNOOSA description, translated into Spanish. Two corrections were
applied to the IVIA source and should stay:

- "Instituto Geofísico Nacional" is the Instituto Geográfico Nacional de España.
- The last sentence was cut off after "y los existen". It closes on the observatories in the
  Northern Hemisphere.

## Adding an organization

The directory reads `Collaboration` records. An organization has:

- `id`: database-generated UUID, used as the React key and translation foreign key.
- `name`: official name, shared across languages.
- `country`: Spanish base text, with `country` in an `en` translation row.
- `scope`: Prisma `NATIONAL` or `INTERNATIONAL`, mapped to the existing card scope.
- `position`: display order, independent of language.
- `acronym`: optional. A null value omits the "Siglas" line.

New organizations and changed translations appear on the next request without editing the
catalogues or deploying. A future management UI must follow the bilingual write, permission,
transaction and review rules in `translate-database-content.md`; this PBI adds no admin CRUD.

## Adding an initiative

Add initiative structure to `getCollaborationsContent` in `app/lib/collaborations.ts` and its
text to the `collaborations.initiatives` namespace in both catalogues:

- `id`, `title`, and one or more `paragraphs`.
- `href` and `linkLabel` together. Both are required for the button; either one missing hides it.
- `logo`: optional `{ src, alt, width, height }`. `src` is a path under `apps/web/public/`
  (the current marks are `/brand/logo-ISWI.png` and
  `/brand/logo-Iniciativa-VLBI-Ibero-Americana.png`). `width` and `height` are the image's
  intrinsic size, which Next.js uses for the pre-load box; CSS then scales the logo to the column.
  `alt` is the accessible name of the image, so describe the mark. Do not leave it empty.

A card without `logo` is a single text column. The section heading
("Iniciativas internacionales de las que LASCE forma parte") is `initiatives.title` in the same
namespace, not a per-item field.
