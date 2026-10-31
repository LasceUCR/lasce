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

## Pagination and loading (LASCE-PAG-001 / LASCE-PUB-002)

The index reads `?page=` on the server. `getResearchAreasPage` counts and selects a page in a
`RepeatableRead` transaction, so both use the same database snapshot. The query applies `skip`
and `take` using the shared `PAGE_SIZE = 10` in `app/lib/pagination.ts`. Ordering is
`createdAt DESC, id DESC`: new areas appear first, edits do not move them, and equal timestamps
cannot shuffle page boundaries. The public response contains no `editing` data; the server
supplies it only after checking `edit_components` for the index's editor.

The canonical first page is `/investigacion`; later pages use `/investigacion?page=2`. Empty,
malformed, repeated, zero and negative page parameters redirect to the first page. Pages past
the end redirect to the last available page. With no areas, the page shows a translated empty
state and no indicator. Shared `Pagination` links preserve reload, back and forward navigation,
mark the current page with `aria-current`, and disappear for ten or fewer areas. The cookie-based
language switch keeps the URL and the same ordering, including legacy translation fallbacks.

Create, edit and delete success handlers refresh the server result. The current page remains
selected while valid; deleting the last item on the last page redirects to the new last page.
Creating an area while viewing a later page keeps that page and updates its items and totals.

Only the dynamic section suspends. The title, introductory text and back link render outside
`Suspense`; `ResearchAreasSkeleton` stays visible until both permissions and data resolve. Its
three representative cards reuse the real card's responsive classes and shared `Skeleton` /
`SkeletonText`, with a translated status, a busy region and an inert, hidden decorative list.
Reduced motion comes from the shared skeleton stylesheet. There is no new cache or loading
boundary on detail routes.

### Validation

- Unit tests cover bounded queries, empty results, totals, public data, translated status and
  Suspense replacement, alongside the existing editor success/failure tests.
- `tests/integration/research-areas-pagination.test.ts` checks actual PostgreSQL ordering and
  page boundaries, including equal creation timestamps and language changes.
- The existing Playwright command runs both specs without additional configuration:
  `pnpm --filter @lasce/web test:e2e research-areas-pagination.spec.ts research-areas-skeleton.spec.ts`.
  Fixtures add and clean up only their own rows, preserving existing content. Pagination checks
  account for that content when asserting totals and boundaries.
- For all exact 0/10/11/23 scenarios, run the command against an empty, migrated, disposable
  database by supplying its connection through the existing `DATABASE_URL` to both Playwright
  and its server. Start with port 3000 free so the existing runner starts the correct server.
  The empty-collection case is skipped when unrelated areas already exist; it never clears them.
- Skeleton tests briefly lock the research table to observe real streaming, release it in
  `finally`, then verify reduced motion, replacement and matching geometry. They run only on a
  local `*_test` database or a local CI service. Unit tests cover the loading component everywhere.
- Browser tests also cover history, language fallback, details, authorized creation/deletion,
  accessibility and responsive widths. Creation uses the real API with a repository photo;
  the form unit tests cover uploads and its success refresh.

## Layout

The areas are shown the same way `/publicaciones` and `/noticias` show their items: a single
column of full-width cards, 16px apart. The card deliberately repeats the `.news-card` metrics
(`globals.css`, the "Research areas" block after the gallery rules):

| Width    | Card                                                                               |
| -------- | ---------------------------------------------------------------------------------- |
| > 1120px | 280px photo column, text padded 20px 22px, 190px minimum height                    |
| ≤ 1120px | Same, text padded 16px 18px                                                        |
| ≤ 700px  | Stacked: 200px photo on top, text below, summary aligned left instead of justified |

The summary is clamped to three lines with `TruncatedText` ([`truncated-text.md`](truncated-text.md)), so cards keep the same height; a description that does not fit ends its third line in an inline "… Leer más" that shows the rest in place, followed by "Leer menos", and a short description gets no toggle. The button is pinned to the bottom-right corner of the card, so the buttons form one aligned column down the right edge of the list, on phones as well. The full text is always in the page for assistive technology, and it is the lead of the detail page.

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

The API (`/api/research-areas`; writes require the corresponding CMS permission):

| Route                        | Method | Body                                                                                        |
| ---------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| `/api/research-areas?page=2` | GET    | public; `{ areas, page, pageSize, totalItems, totalPages, skip, take }`, never editing data |
| `/api/research-areas`        | POST   | `{ content: { es, en }, src }`                                                              |
| `/api/research-areas/[id]`   | PATCH  | `{ version, content?: { es, en }, confirmedUnchanged?, src? }`                              |
| `/api/research-areas/[id]`   | DELETE | none; 204, or 404 when there was nothing to delete                                          |

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
`/investigacion`. That card is the first item in the list, and the area just created is shown
first. Fill in the title and the description in Spanish and in English, and upload a
photograph (landscape works best; it is cropped to fill the 280px column, and to a 200px-high band
on phones).

For local and development databases, `packages/db/prisma/seed.ts` writes the seeded areas in
Spanish and English (`pnpm db:seed`). An area without `src` shows a labelled placeholder instead of
a broken image.
