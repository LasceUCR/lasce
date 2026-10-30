# Initiative management (LASCE-CON-012)

The initiatives section of `/colaboraciones-e-iniciativas` reads PostgreSQL on every request.
Editors can create, update and delete initiatives in edit mode. Partner organization management
is independent and unchanged.

## Content and migration

- `research.initiatives` stores the Spanish title and description, optional `logo_url` and
  `website_url`, display order and the timestamps used for optimistic concurrency.
- `research.initiative_translations` stores English text with a unique `(initiative_id, locale)`
  key and a cascading foreign key. IDs and timestamps have database defaults.
- `20261027120000_add_initiatives_cms` creates the tables and inserts ISWI and IVIA with the exact
  existing Spanish and English titles and paragraphs, logos and official links. Paragraphs are
  separated by blank lines. This runs once through `pnpm db:migrate:deploy`; running the normal
  seed again never overwrites edits or restores deleted initiatives.
- The old catalogue content in `collaborations.initiatives.items` remains a historical fixture
  for stories and migration regression tests. The public route replaces those fixture items with
  database records, including an empty list after all initiatives are deleted.
- The worker does not consume these tables and has no initiative model or migration.

## Editing contract

Titles (up to 300 characters) and descriptions (up to 20,000 characters) are required in both
Spanish and English on creation. Forms use the shared content definition, language tabs and
translation review rules. Changing a field in one language requires either changing its counterpart
or explicitly confirming that it remains correct. Shared-only changes leave translations intact,
including on legacy rows. Incomplete legacy records use the shared fallback and unknown language
marker rather than copying or inventing translations.

Optional website URLs accept HTTP(S) without embedded credentials. The logo field uses the shared
`FileDropInput`: select or drop a PNG, JPEG, WebP or GIF (up to 25 MiB), preview it, replace it or
remove it. Saving uploads a selected file before saving the record. Upload failures preserve the
form and show a translated toast; retrying a failed record save reuses the successful upload.
The form cannot be closed or changed during a save. Existing URLs and bundled `/brand/<filename>`
logos remain readable; editors no longer enter a logo URL. Blank values clear the field.

Uploaded images use UUID filenames under `assets/initiatives/` in `MINIO_BUCKET` and are served
through `/api/initiatives/logos/[filename]`. The handler bounds the request size and validates the
image's MIME type and signature. The storage helper constructs its client lazily and never changes
the shared bucket's access policy or accesses worker objects. Serving through the application also
works when MinIO is reachable only on an internal Docker hostname. No new migration is needed:
`logo_url` stores the application's image path. MinIO must be running and configured for uploads.
Broken images are hidden while the text remains readable. External website links use
`noopener noreferrer`.

| Endpoint                                  | Permission          | Result                                           |
| ----------------------------------------- | ------------------- | ------------------------------------------------ |
| `GET /api/initiatives`                    | Public              | Localized content, no editing metadata           |
| `POST /api/initiatives`                   | `create_components` | Bilingual create, 201                            |
| `PATCH /api/initiatives/[id]`             | `edit_components`   | Changed fields plus required `version`, 200      |
| `DELETE /api/initiatives/[id]`            | `delete_components` | Cascading delete, 204                            |
| `POST /api/initiatives/logos?mode=create` | `create_components` | Multipart image upload, 201                      |
| `POST /api/initiatives/logos?mode=edit`   | `edit_components`   | Multipart image upload, 201                      |
| `GET /api/initiatives/logos/[filename]`   | Public              | Image bytes, restricted to the initiative prefix |

The server page includes `editing.content` and `editing.version` only after checking edit permission.
Each write endpoint independently enforces its permission, parses JSON and validates its schema.
Create and update run inside the shared `runWrite` transaction. Conditional updates on `updated_at`
reject concurrent saves with 409. Failed translation writes roll back base changes as well.
Delete is a single database operation with a cascading foreign key, following explicit UI confirmation.

The editor retains values after failures and shows translated outcome toasts through
`useRequestFeedback`. Field validation remains beside the inputs, including API field errors.
The Spanish and English UI labels live under `initiatives` in the message catalogues.

As with the existing image editors, replacing/removing a logo or abandoning a form after an upload
does not delete the stored object. Unreferenced images require a separate cleanup policy.

## Verification

- Unit tests cover URL/text validation, review in either direction, partial patches, legacy
  fallback, permission-aware controls, deletion confirmation, failure/retry and optional media.
- `tests/integration/initiatives.test.ts` checks the migration against the original content,
  actual PostgreSQL persistence, concurrent saves, translation rollback and cascading deletion.
  Use the existing integration guard with a separate local `*_test` database and applied migrations.
- `tests/e2e/initiative-cms.spec.ts` requires MinIO in addition to PostgreSQL and exercises image
  selection, persistence and removal, the real routes and editor, anonymous/assistant/visitor
  permissions, invalid JSON and input, review and stale versions, English feedback, keyboard labels,
  accessibility and a mobile viewport. The existing initiative description tests preserve expansion
  behavior and reduced-motion support.

Follow [testing.md](testing.md) for the workspace checks and
[translate-database-content.md](translate-database-content.md) for the shared translation contract.
