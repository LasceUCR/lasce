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

Optional website URLs accept HTTP(S) without embedded credentials. Logos accept the same URLs or
bundled `/brand/<filename>` image paths. Blank values clear the field. Logo management is by URL;
this feature does not upload files or use MinIO. Images load directly in the browser, without
server fetching or Next image optimization. Broken images are hidden while the text remains
readable. External website links use `noopener noreferrer`.

| Endpoint                       | Permission          | Result                                      |
| ------------------------------ | ------------------- | ------------------------------------------- |
| `GET /api/initiatives`         | Public              | Localized content, no editing metadata      |
| `POST /api/initiatives`        | `create_components` | Bilingual create, 201                       |
| `PATCH /api/initiatives/[id]`  | `edit_components`   | Changed fields plus required `version`, 200 |
| `DELETE /api/initiatives/[id]` | `delete_components` | Cascading delete, 204                       |

The server page includes `editing.content` and `editing.version` only after checking edit permission.
Each write endpoint independently enforces its permission, parses JSON and validates its schema.
Create and update run inside the shared `runWrite` transaction. Conditional updates on `updated_at`
reject concurrent saves with 409. Failed translation writes roll back base changes as well.
Delete is a single database operation with a cascading foreign key, following explicit UI confirmation.

The editor retains values after failures and shows translated outcome toasts through
`useRequestFeedback`. Field validation remains beside the inputs, including API field errors.
The Spanish and English UI labels live under `initiatives` in the message catalogues.

## Verification

- Unit tests cover URL/text validation, review in either direction, partial patches, legacy
  fallback, permission-aware controls, deletion confirmation, failure/retry and optional media.
- `tests/integration/initiatives.test.ts` checks the migration against the original content,
  actual PostgreSQL persistence, concurrent saves, translation rollback and cascading deletion.
  Use the existing integration guard with a separate local `*_test` database and applied migrations.
- `tests/e2e/initiative-cms.spec.ts` exercises the real routes and editor, anonymous/assistant/visitor
  permissions, invalid JSON and input, review and stale versions, English feedback, keyboard labels,
  accessibility and a mobile viewport. The existing initiative description tests preserve expansion
  behavior and reduced-motion support.

Follow [testing.md](testing.md) for the workspace checks and
[translate-database-content.md](translate-database-content.md) for the shared translation contract.
