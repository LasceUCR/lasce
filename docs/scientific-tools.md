# Scientific tools (LASCE-CON-012-383)

`/herramientas-cientificas` presents LASCE's external tools, such as SWAAT and SWAPRO, as
cards. Each card shows the tool's name, description and image, plus an "Acceder a <tool>" button
that opens the tool in a new tab. The tools are stored in PostgreSQL and authorized editors manage
them in place through Modo edición, so changing a description or a link, or adding a tool, needs
no developer and no deployment. SWAAT and SWAPRO themselves stay externally hosted: LASCE only
manages how they are presented and linked.

The page's hero (kicker, title and introduction) and its fixed labels stay in the message
catalogues, under `scientificTools`.

## Content

| Field         | Stored in                                         | Language                      | Rules                                                    |
| ------------- | ------------------------------------------------- | ----------------------------- | -------------------------------------------------------- |
| Name          | `scientific_tools.name`                           | Shared: a product name        | Required, up to 100 characters                           |
| Description   | `scientific_tools.description` + `…_translations` | Spanish base row, English row | Required in every language, up to 2,000 characters       |
| Access URL    | `scientific_tools.access_url`                     | Shared                        | Required, `https` only, no embedded credentials, ≤ 2,048 |
| Image         | `scientific_tools.image_url`                      | Shared                        | Optional; only an image uploaded through the editor      |
| Display order | `scientific_tools.position`                       | Shared                        | A new tool is shown after the existing ones              |

The description uses the shared bilingual helpers (`scientificToolContent` in
`app/lib/scientific-tool-schema.ts`), so it follows every rule of
[`translate-database-content.md`](translate-database-content.md): both languages on create, the
cross-language review on edit, optimistic concurrency on `updated_at`, and legacy fallback. The
tables are described in [`database-definition.md`](database-definition.md).

**There is no seed.** The migration `20261113180000_add_scientific_tools` creates the tables
empty, and `packages/db/prisma/seed.ts` does not insert tools. Until an editor adds one, the page
shows "No hay herramientas científicas disponibles en este momento.". The tools that used to be
hardcoded in `app/lib/scientific-tools.ts` (and `NEXT_PUBLIC_SWAAT_URL`) are gone: add SWAAT and
SWAPRO from Modo edición after deploying. Their former descriptions are kept as fixtures in
`tests/e2e/scientific-tools.spec.ts`.

A tool without an image, or whose image fails to load, shows a neutral flask illustration. If the
tools cannot be read, the page logs the error and shows the empty state instead of failing.

## Managing tools

Turn on **Modo edición** and open `/herramientas-cientificas`. The server checks each grant
separately, using the existing component grants
([`role-permissions.md`](role-permissions.md)):

| Action        | Grant               | By default                 |
| ------------- | ------------------- | -------------------------- |
| Add a tool    | `create_components` | Administrators             |
| Edit a tool   | `edit_components`   | Administrators, assistants |
| Delete a tool | `delete_components` | Administrators             |

The editing data (every language and the version) reaches the page only for an account with
`edit_components`. Each API route repeats its own check, so a request sent directly to the server
without the grant is rejected and stores nothing.

`ScientificToolsManager` lists the cards (`ScientificToolCard`), wraps each one in
`EditableWrapper` for edit and delete, and puts an `AddItemCard` after the list.
`ScientificToolForm` is shared by add and edit. It has the name, the description in `LanguageTabs`
with `TranslationReview`, the access URL and a `FileDropInput` for the image. The form points at
the invalid field and language, keeps what was typed when a save fails, and asks before discarding
changes. Outcomes are reported with toasts through `useRequestFeedback`
("Herramienta científica agregada / actualizada / eliminada correctamente."). Deleting asks for
confirmation. Each create, update and delete records a `scientific_tool.*` event in the audit
trail ([`audit-log.md`](audit-log.md)).

## API

| Endpoint                                        | Permission          | Result                                          |
| ----------------------------------------------- | ------------------- | ----------------------------------------------- |
| `GET /api/scientific-tools`                     | Public              | Tools in the request language, no editing data  |
| `POST /api/scientific-tools`                    | `create_components` | Create, 201                                     |
| `PATCH /api/scientific-tools/[id]`              | `edit_components`   | Changed fields plus the required `version`, 200 |
| `DELETE /api/scientific-tools/[id]`             | `delete_components` | Delete with its translations, 204               |
| `POST /api/scientific-tools/images?mode=create` | `create_components` | Multipart image upload, 201 `{ imageUrl }`      |
| `POST /api/scientific-tools/images?mode=edit`   | `edit_components`   | Multipart image upload, 201 `{ imageUrl }`      |
| `GET /api/scientific-tools/images/[filename]`   | Public              | Image bytes, limited to the tools' prefix       |

Errors follow the shared JSON envelope (`invalid-body` with field paths, `review-required`,
`conflict`, `not-found`). Images are PNG, JPEG, WebP or GIF of up to 25 MiB. They are checked by
signature and stored under `assets/scientific-tools/` in `MINIO_BUCKET` through the shared
`createImageStore()` ([`add-a-cms-feature.md`](add-a-cms-feature.md#uploading-an-image)). As with
initiative logos, replacing an image or abandoning a form after an upload does not delete the
stored object.

## Files

| Piece          | File                                                                      |
| -------------- | ------------------------------------------------------------------------- |
| Route          | `app/(public)/herramientas-cientificas/page.tsx`                          |
| Validation     | `app/lib/scientific-tool-schema.ts`                                       |
| Reads / writes | `app/lib/scientific-tool-records.ts`, `app/lib/scientific-tool-writes.ts` |
| Editor helpers | `app/lib/scientific-tool-form.ts`                                         |
| API            | `app/api/scientific-tools/**`                                             |
| Image storage  | `app/services/scientific-tools/imageStorage.ts`                           |
| Components     | `app/components/public/scientific-tools/`                                 |

## Tests

- Unit tests sit next to each module and component, plus
  `tests/unit/services/scientific-tools/imageStorage.test.ts`.
- `tests/integration/scientific-tools.test.ts` checks persistence, order, translation rollback,
  stale versions and cascade deletes against a disposable `*_test` database.
- `tests/e2e/scientific-tools.spec.ts` inserts its own SWAAT and SWAPRO rows and checks
  navigation, layout, both languages and accessibility. `tests/e2e/scientific-tools-cms.spec.ts`
  adds, edits and removes a tool through the UI with the image upload stubbed, and checks the
  permission and validation boundaries of the API.
