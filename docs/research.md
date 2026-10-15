# Research areas

How `/investigacion` and its detail pages are built, and how to add an area. The areas are database
content: `areas.research_areas` holds each area's Spanish title and description and its photograph,
and `areas.research_area_translations` its other languages (see
[`database-definition.md`](database-definition.md)). Administrators create, edit and delete them in
"Modo edición". Publications are a different page, `/publicaciones`, backed by the `research`
schema.

## The shape

```
/investigacion                        page.tsx            TopicHero h1
  └─ ResearchAreasSection             section.research-areas.page-width
       └─ ul.research-area-list › li  one card per row, full page width
            └─ ResearchAreaCard       article, named by its h3
                 ├─ MediaFrame        photograph, alt=""
                 └─ content           h3 title, 3-line summary, "Conozca más sobre esta área"
/investigacion/areas/[id]             ResearchAreaPage    h1 area title, full description as lead
```

| Piece              | File                                                      | Covered by                                    |
| ------------------ | --------------------------------------------------------- | --------------------------------------------- |
| Reading and writes | `app/lib/research-areas.ts`, `research-area-schema.ts`    | `app/lib/research-areas.test.ts`, integration |
| Fixed copy         | `researchAreas` in `apps/web/messages/{es,en}.json`       | `app/lib/i18n/messages.test.ts`               |
| Index route        | `app/(public)/investigacion/page.tsx`                     | `tests/e2e/research-areas-i18n.spec.ts`, axe  |
| List and editor    | `app/components/public/research/ResearchAreasSection.tsx` | `ResearchAreasSection.test.tsx`               |
| One area card      | `…/research/ResearchAreaCard.tsx`                         | `ResearchAreaCard.test.tsx`                   |
| Detail route       | `app/(public)/investigacion/areas/[id]/page.tsx`          | `tests/e2e/public-portal.spec.ts`, i18n spec  |
| Detail page        | `…/research/ResearchAreaPage.tsx`                         | `ResearchAreaPage.test.tsx`                   |
| API                | `app/api/research-areas/**`                               | `route.test.ts` next to each route            |

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

## Languages

The page follows the language chosen in the header (the `lasce_locale` cookie), like the rest of
the site ([`internationalization.md`](internationalization.md)):

- **Fixed copy** (the page title and lead, the card's button, the photograph placeholder, the
  detail page's kicker and back link, and the whole editor) is in the `researchAreas` namespace of
  the message catalogues.
- **Each area's title and description** come from the database in the visitor's language, through
  the shared content helpers ([`translate-database-content.md`](translate-database-content.md)).
  An area with no English yet is shown in its base text in both languages, with `lang=""` because
  that text's language is unknown; nothing is translated automatically. The photograph is shared.
- The translated text carries its `lang` (`contentLangAttribute`) on the card's heading, summary
  and hidden link suffix, and on the detail page's heading and lead (`TopicHero`'s `contentLang`).
  The page's own copy keeps the page's language.

## Editing

In "Modo edición", an account with `create_components`, `edit_components` or `delete_components`
sees the "Agregar área de investigación" card and an edit and a delete button on each area. The
buttons only show in edit mode. The editor (`ResearchAreaForm`) follows
[`translate-database-content.md`](translate-database-content.md):

- The title and the description sit in one tab per language (`LanguageTabs`), both required in
  Spanish and English. The photograph is shared by every language, so it sits below the tabs.
- A field changed in one language only must change in the other too, or be confirmed as still
  correct with the switch under it (`TranslationReview`), in the same edit.
- An area with no English yet opens with its base text on the Spanish tab, flagged as possibly
  not Spanish, and an empty English tab marked "Sin traducción". Its photo can be changed without
  translating it; completing its English asks to review its base text once.
- Saving asks for no confirmation. Closing with unsaved changes asks first, from "Cancelar", the
  modal's close button or Escape. Deleting asks first.
- The editor's labels and messages follow the site's language (`researchAreas.editor`,
  `researchAreas.validation`, `researchAreas.discardDialog`, `researchAreas.deleteDialog`).

The API (`/api/research-areas`, all behind the CMS permissions):

| Route                      | Method | Body                                                           |
| -------------------------- | ------ | -------------------------------------------------------------- |
| `/api/research-areas`      | GET    | none; the areas in the request's language, never editing data  |
| `/api/research-areas`      | POST   | `{ content: { es, en }, src }`                                 |
| `/api/research-areas/[id]` | PATCH  | `{ version, content?: { es, en }, confirmedUnchanged?, src? }` |
| `/api/research-areas/[id]` | DELETE | none; 204, or 404 when there was nothing to delete             |

Errors use the shared envelope of `app/lib/cms/http.ts` (`invalid-body` with paths such as
`content.en.title`, `review-required`, `conflict` for a stale version, `not-found`). The contracts
are in `app/lib/research-area-schema.ts`, which the editor also validates with.

## Feedback

Creating, editing and deleting an area report their outcome with a toast through
`useRequestFeedback` ([`toasts.md`](toasts.md)): "Área de investigación agregada / actualizada /
eliminada correctamente.", or the server's reason when it fails. On failure the form stays open
with what was typed. A photo the server refuses to upload is reported in an error toast too.

## Adding an area

In "Modo edición", with `create_components`, use the "Agregar área de investigación" card on
`/investigacion`: fill in the title and the description in Spanish and in English, and upload a
photograph (landscape works best; it is cropped to fill the 280px column, and to a 200px-high band
on phones).

For local and development databases, `packages/db/prisma/seed.ts` writes the seeded areas in
Spanish and English (`pnpm db:seed`). An area without `src` shows a labelled placeholder instead of
a broken image.
