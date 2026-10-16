# Home page content (CMS)

How the editable parts of the public home page (`/`) are stored, edited and reordered
(LASCE-CON-012-150, issue #152). The bilingual parts follow
[`translate-database-content.md`](translate-database-content.md); the edit-mode wiring follows
[`add-a-cms-feature.md`](add-a-cms-feature.md).

## What is editable

Only these, and only in "Modo edición" by an account with `edit_components`. Nothing on the home
page can be added or deleted from the CMS.

| Content                 | Fields                                   | Languages                             | Limits                 |
| ----------------------- | ---------------------------------------- | ------------------------------------- | ---------------------- |
| Hero banner             | `title`, `lead` (the subtitle)           | Both required, in Spanish and English | 120 and 300 characters |
| Each geomagnetic index  | `value` (`"-12 nT"`)                     | Shared: the same in every language    | 15 characters          |
|                         | `description` (`"Estable"` / `"Stable"`) | Both required, in Spanish and English | 15 characters          |
| The indices, as a whole | Display order                            | n/a                                   | Every index, once      |

Everything else stays fixed copy in `apps/web/messages/` (`home` namespace): the institution's
name, the call to action, the section titles, "Datos de demostración" and each index's label
("Índice Kp"), which is looked up by the index's `code`.

## Storage

Four tables in the `public` schema, described in
[`database-definition.md`](database-definition.md#public-schema-home-page):

- `home_hero` + `home_hero_translations`: one row, Spanish on the base row, English in the
  translation row.
- `geomagnetic_indices` + `geomagnetic_index_translations`: one row per index (`kp`, `dst`, `ae`,
  `ap`), its `description` translated, its `value` shared.

The migration `20261014101056_add_home_content` seeds both with the text the page showed from the
catalogue before, in both languages, so the page looked the same right after migrating. If the
rows are missing (an empty database), the page falls back to the catalogue's text
(`home.hero.*`, `home.indicators.<code>.value|description`) and shows no edit controls.

## Reading

`apps/web/app/(public)/page.tsx` is dynamic. It reads the header's language with
`resolveLocale(await getLocale())`, checks `edit_components` on the server, and calls
`getHomeContent(locale, { includeEditingData })` from `app/lib/home.ts`. Every language and the
version to save against (`editing`) are sent only to an editor. Rendered text carries
`lang={contentLangAttribute(contentLocale)}`.

## Editing

| Route                       | Method | Body                                                             |
| --------------------------- | ------ | ---------------------------------------------------------------- |
| `/api/home/hero`            | PATCH  | `{ version, content: { es, en }, confirmedUnchanged? }`          |
| `/api/home/indicators/[id]` | PATCH  | `{ version, value?, content?: { es, en }, confirmedUnchanged? }` |
| `/api/home/indicators`      | PUT    | `{ ids }`: every index id once, in the new order                 |

All three check `edit_components` and answer with the envelope of `app/lib/cms/http.ts`
(`invalid-json`, `invalid-body` with paths such as `content.en.description`, `invalid-id`,
`review-required`, `not-found`, `conflict`, `internal-error`). The contracts are in
`app/lib/home-schema.ts`, which the editors also validate with.

- A content save sends both languages in full. A field changed in one language only must change
  in the other too, or be confirmed as still correct (`TranslationReview`), in the same edit.
- A value-only edit of an index never touches its translations, so it works on an index that has
  no English row yet.
- Every write runs in one transaction against the `updated_at` the editor loaded and moves it
  forward. A stale save gets a 409, whose reason the error toast shows; it never retries.

The editors (`app/components/public/home/`):

- `EditableHomeHero` + `HomeHeroForm` for the banner, and `GeomagneticIndicators` +
  `IndicatorForm` for the indices. Both forms use `LanguageTabs`, `TranslationReview`, `Modal`
  and `StandardConfirmDialog` (discarding unsaved changes), the same way as the publications
  editor. `EditableWrapper` gets only `onEdit`, so there is no delete button.
- The outcome of a save is a toast, through the shared `useRequestFeedback` (see
  [`toasts.md`](toasts.md)): on failure the form stays open with what was typed. Each component
  keeps one request at a time with a `useRef` guard, which the hook does not do.
- Known limitation: the error toast shows the server's reason as is, and the API always answers
  in Spanish, so an editor reading the site in English sees Spanish errors (the fallbacks in
  `home.saveErrors` and `common.feedback` are translated). Field-level errors from the server are
  not shown under their fields either; the forms validate with the same rules before sending, so
  the server rarely has any. Both are pending a team decision on the shared hook.

| Outcome      | Spanish                                         | English                                 |
| ------------ | ----------------------------------------------- | --------------------------------------- |
| Banner saved | Portada actualizada correctamente.              | Hero banner updated successfully.       |
| Index saved  | Índice geomagnético actualizado correctamente.  | Geomagnetic index updated successfully. |
| Order saved  | Orden de los índices actualizado correctamente. | Index order updated successfully.       |

## Reordering

In edit mode each index card has a drag handle ("Reordenar Índice Kp") beside its edit button:
`GeomagneticIndicators` renders each card in `EditableWrapper` with `drag`, inside a
[`@dnd-kit`](https://dndkit.com) `DndContext` and `SortableContext` of its own (see
[`add-a-cms-feature.md`](add-a-cms-feature.md#reordering-items)):

- It works with a pointer, a finger (a short press first) or the keyboard: focus the handle,
  press Space or Enter, move with the arrow keys, press Space or Enter again to drop, Escape to
  cancel. Each step is announced in the site's language (`home.editor.reorder*`).
- A drop moves the cards at once and sends `PUT /api/home/indicators`. If it fails, an error
  toast says why and the cards go back to where they were.
- The order is refused as a conflict unless it lists exactly the stored indices.
- `position` is unique, and sent with each index. The cards name it with `EditableWrapper`'s
  `positionField` (`position`) and pass the index as `record`, so a card without a position, such
  as the catalogue's fallback, shows no handle. The request carries that name, and the server accepts only the
  position columns of `geomagnetic_indices` (`indicatorPositionFields`), so a request cannot
  write to any other column. The rows move to temporary negative positions first, then to their
  new ones, in one transaction, so two cards never hold the same position.
- A row inserted without a position, as a future loading job would add a new index, takes the
  next number of the column's sequence, so it lands last.
- Moving a card writes its row, so it moves that row's version forward: an index editor opened
  before someone else's reorder gets a conflict and has to reload. That is deliberate: it is the
  safe outcome, and reorders are rare.

`moveIndicator` in `app/lib/home-form.ts` computes the new order; it is the pure part the unit
tests cover. The real drag is covered by `tests/e2e/home-i18n.spec.ts`.

## Future automatic loading

Today the index values are typed by hand and the section says "Datos de demostración". The
schema already allows a worker job to load them from a real source later, without a breaking
migration:

- **Key.** `geomagnetic_indices.code` is unique and stable. A job upserts by it, never by id.
- **Columns a job owns.** `value`, `description` and its translation rows, `source` (set to
  `automatic`) and `observed_at` (when the value was observed). A CMS save sets `source` back to
  `manual` and clears `observed_at`.
- **Column a job must not touch.** `position`: the order is editorial. A new index left without
  one gets the next number and lands last.
- **Versions.** A job sets `updated_at` to now (strictly later than before), so an editor holding
  an older version gets a conflict instead of overwriting fresh data.
- **Where.** The SQLAlchemy mirror is in `apps/worker/app/db/models.py` (`GeomagneticIndex`,
  `GeomagneticIndexTranslation`, `GeomagneticIndexSource`). Add the job itself with
  [`add-a-job.md`](add-a-job.md): contract, processor, registry and a schedule in
  `packages/jobs/src/schedules.ts`.
- **Page.** Once values arrive automatically, drive the "Datos de demostración" notice from
  `source` (show it only while some index is `manual`), and consider showing `observed_at`.
- **Descriptions.** A job writing a description must write it in every language, as the CMS
  does. A record without its English row is treated as legacy (shown in its base text with
  `lang=""`).

## Tests

| Layer        | File                                                               |
| ------------ | ------------------------------------------------------------------ |
| Contract     | `apps/web/app/lib/home-schema.test.ts`                             |
| Service      | `apps/web/app/lib/home.test.ts` (Prisma mocked)                    |
| Editor logic | `apps/web/app/lib/home-form.test.ts`                               |
| Routes       | `apps/web/app/api/home/**/route.test.ts`                           |
| Components   | `apps/web/app/components/public/home/*.test.tsx`                   |
| Database     | `apps/web/tests/integration/home.test.ts` (disposable `*_test` DB) |
| End to end   | `apps/web/tests/e2e/home-i18n.spec.ts`                             |
| Worker       | `apps/worker/tests/test_db_models.py`                              |

The integration and end-to-end tests edit the seeded rows and write them back afterwards. They
never change the banner's title, which other specs use to find the home page.
