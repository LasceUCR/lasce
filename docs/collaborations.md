# Collaborations and initiatives

How `/colaboraciones-e-iniciativas` is built. The content is static. Partner organizations live in
[`apps/web/app/lib/research-collaborations.ts`](../apps/web/app/lib/research-collaborations.ts)
and the ISWI and IVIA copy lives in
[`apps/web/app/lib/collaborations.ts`](../apps/web/app/lib/collaborations.ts). Nothing here is
read from PostgreSQL. Changing a name, a paragraph, a logo or a link means editing those files
and deploying.

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

| Piece                  | File                                                          | Covered by                                   |
| ---------------------- | ------------------------------------------------------------- | -------------------------------------------- |
| Initiative copy        | `app/lib/collaborations.ts`                                   | `CollaborationsPage.test.tsx`                |
| Partner organizations  | `app/lib/research-collaborations.ts`                          | `ResearchCollaborationsSection.test.tsx`     |
| Route                  | `app/(public)/colaboraciones-e-iniciativas/page.tsx`          | `tests/e2e/public-portal.spec.ts`, axe sweep |
| Page                   | `app/components/public/collaborations/CollaborationsPage.tsx` | `CollaborationsPage.test.tsx`                |
| Organisation section   | `…/research/ResearchCollaborationsSection.tsx`                | `ResearchCollaborationsSection.test.tsx`     |
| One organization card  | `…/research/CollaborationCard.tsx`                            | `CollaborationCard.test.tsx`                 |
| Desktop and mobile nav | `app/components/public/PublicHeader.tsx`                      | `PublicHeader.test.tsx`, `accessibility-seo` |

`publicPaths` in `app/lib/site.ts` lists `/colaboraciones-e-iniciativas` after `/nosotros`, so the
route is in the sitemap.

## Navigation

The desktop header groups the page with Quiénes somos under **Nosotros**, the same disclosure
pattern as **Recursos**. The group label is not itself a link. The mobile menu lists
"Quiénes somos" and "Colaboraciones e Iniciativas" as flat links and does not show the word
"Nosotros".

## Layout

**Organisations.** A grid of cards: four columns above 1080px, two columns down to 760px, one
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

Append an entry to `researchCollaborations` in `app/lib/research-collaborations.ts`:

- `id`: unique, used as the React key.
- `name`, `country`.
- `scope`: `'national'` or `'international'`. That chooses the badge and the pin or globe icon.
- `acronym`: optional. Omit it and the card does not show a "Siglas" line.

The section, its story and `CollaborationsPage` all read that array. No route change.

## Adding an initiative

Append an entry to `collaborationsContent.initiatives.items` in `app/lib/collaborations.ts`:

- `id`, `title`, and one or more `paragraphs`.
- `href` and `linkLabel` together. Both are required for the button; either one missing hides it.
- `logo`: optional `{ src, alt, width, height }`. `src` is a path under `apps/web/public/`
  (the current marks are `/brand/logo-ISWI.png` and
  `/brand/logo-Iniciativa-VLBI-Ibero-Americana.png`). `width` and `height` are the image's
  intrinsic size, which Next.js uses for the pre-load box; CSS then scales the logo to the column.
  `alt` is the accessible name of the image, so describe the mark. Do not leave it empty.

A card without `logo` is a single text column. The section heading
("Iniciativas internacionales de las que LASCE forma parte") is `initiatives.title` in the same
file, not a per-item field.
