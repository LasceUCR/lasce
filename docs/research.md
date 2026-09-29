# Research areas

How `/investigacion` and its detail pages are built, and how to add an area. The content is static:
every area lives in [`apps/web/app/lib/research-areas.ts`](../apps/web/app/lib/research-areas.ts),
and its photograph lives in `apps/web/public/images/research/`. Publications are a different page,
`/publicaciones`, backed by the `research` schema in PostgreSQL (see
[`database-definition.md`](database-definition.md)).

## The shape

```
/investigacion                        page.tsx            TopicHero h1
  └─ ResearchAreasSection             section.research-areas.page-width
       └─ ul.research-area-list › li  one card per row, full page width
            └─ ResearchAreaCard       article, named by its h3
                 ├─ MediaFrame        photograph, alt=""
                 └─ content           h3 title, 3-line summary, "Conozca más sobre esta área"
/investigacion/areas/[slug]           ResearchAreaPage    h1 area title, full description as lead
```

| Piece              | File                                                      | Covered by                                   |
| ------------------ | --------------------------------------------------------- | -------------------------------------------- |
| Content and lookup | `app/lib/research-areas.ts`                               | `app/lib/research-areas.test.ts`             |
| Index route        | `app/(public)/investigacion/page.tsx`                     | `tests/e2e/public-portal.spec.ts`, axe sweep |
| List of areas      | `app/components/public/research/ResearchAreasSection.tsx` | `ResearchAreasSection.test.tsx`              |
| One area card      | `…/research/ResearchAreaCard.tsx`                         | `ResearchAreaCard.test.tsx`                  |
| Detail route       | `app/(public)/investigacion/areas/[slug]/page.tsx`        | `tests/e2e/public-portal.spec.ts`            |
| Detail page        | `…/research/ResearchAreaPage.tsx`                         | `ResearchAreaPage.test.tsx`                  |

## Layout

The areas are shown the same way `/publicaciones` and `/noticias` show their items: a single
column of full-width cards, 16px apart. The card deliberately repeats the `.news-card` metrics
(`globals.css`, the "Research areas" block after the gallery rules):

| Width    | Card                                                                               |
| -------- | ---------------------------------------------------------------------------------- |
| > 1120px | 280px photo column, text padded 20px 22px, 190px minimum height                    |
| ≤ 1120px | Same, text padded 16px 18px                                                        |
| ≤ 700px  | Stacked: 200px photo on top, text below, summary aligned left instead of justified |

The summary is clamped to three lines so every card has the same height. The button is pinned to the bottom-right corner of the card, so the buttons form one aligned column down the right edge of the list, on phones as well. The full text is still in the page for assistive technology, and it is the lead of the detail page.

`.research-areas` has 8px of bottom padding. With `.topic-page-footer`'s 8px, that leaves the same
16px above "Volver al inicio" as any `TopicSection` page, so there is no dead band under the list.

## Accessibility

- Each card is an `article` labelled by its `h3`.
- The photograph is decorative (`alt=""`): the title beside it is the real text, and
  `ResearchArea` has no field for a description of the photograph. Add one before making the image
  informative.
- Each card has one link, the button. Its visible label is the same on every card, so a
  visually hidden suffix adds the title: a screen reader's list of links reads
  "Conozca más sobre esta área (Geomagnetismo y respuesta regional al clima espacial)".

## Adding an area

1. Put the photograph in `apps/web/public/images/research/`. Landscape works best; it is cropped
   to fill the 280px column (and to a 200px-high band on phones).
2. Append an entry to `researchAreas` in `app/lib/research-areas.ts` with a unique, URL-safe
   `slug`, a `title`, a `description` and `src`.

Nothing else changes. The list, the static detail route (`generateStaticParams` over
`researchAreaSlugs`), the `ResearchAreasSection` story and its test, and the e2e check all read
`researchAreas` directly. An area without `src` shows a labelled placeholder instead of a broken
image.
