# Space weather page content (CMS)

How the editable part of the space weather page (`/clima-espacial`) is stored and edited
(LASCE-CON-012-252). The bilingual parts follow
[`translate-database-content.md`](translate-database-content.md); the edit-mode wiring follows
[`add-a-cms-feature.md`](add-a-cms-feature.md). The home page banner
([`home-page.md`](home-page.md)) is built the same way and is the closer reference.

## What is editable

Only the "¿Por qué estudiarlo desde Costa Rica?" card, and only in "Modo edición" by an account
with `edit_components`. It cannot be added or deleted from the CMS.

| Content         | Fields                                       | Languages                             | Limits                  |
| --------------- | -------------------------------------------- | ------------------------------------- | ----------------------- |
| Costa Rica card | `title`, `body` (blank line = new paragraph) | Both required, in Spanish and English | 160 and 5000 characters |

Everything else on the page stays fixed copy in `apps/web/messages/` (`spaceWeather` namespace),
built by `app/lib/space-weather.ts`.

## Storage

Two tables in the `public` schema, described in
[`database-definition.md`](database-definition.md#public-schema-space-weather):
`space_weather_sections` (Spanish on the base row) and `space_weather_section_translations`
(English). A section is found by its unique `key`; the card's is `costa-rica`
(`COSTA_RICA_SECTION_KEY`), so another section of this page can be made editable later without a
new table.

The migration `20261016120000_add_space_weather_sections` seeds the row with the text the page
showed from the catalogue before, in both languages. If the row is missing (an empty database),
the page falls back to the catalogue's `spaceWeather.costaRica.title|p1` and shows no edit
controls.

## Reading

`apps/web/app/(public)/clima-espacial/page.tsx` is dynamic. It reads the header's language with
`resolveLocale(await getLocale())`, checks `edit_components` on the server, and calls
`getSpaceWeatherSection(locale, { includeEditingData })` from `app/lib/space-weather-section.ts`.
Every language and the version to save against (`editing`) are sent only to an editor.

`SpaceWeatherPage` renders the plain `CostaRicaSectionView` for anyone who cannot edit, so a
visitor gets no editor code at all, and `EditableCostaRicaSection` for an editor. The view keeps
the page's existing `TopicSection featured` markup; each paragraph carries
`lang={contentLangAttribute(contentLocale)}`.

## Editing

| Route                           | Method | Body                                                    |
| ------------------------------- | ------ | ------------------------------------------------------- |
| `/api/space-weather/costa-rica` | PATCH  | `{ version, content: { es, en }, confirmedUnchanged? }` |

It checks `edit_components` (401 signed out, 403 without the grant) and answers with the
envelope of `app/lib/cms/http.ts` (`invalid-json`, `invalid-body`, `review-required`,
`not-found`, `conflict`, `internal-error`). The contract is in
`app/lib/space-weather-section-schema.ts`, which the editor also validates with.

- A save sends both languages in full. A field changed in one language only must change in the
  other too, or be confirmed as still correct (`TranslationReview`), in the same edit.
- Like the other bilingual editors, the form is checked when "Confirmar" is pressed, with the
  same rules as the API. Each problem shows under its field and as a count on its language tab;
  the form switches to the tab that has one and focuses the first field to fix, so a change made
  in one language leads straight to the other. "Confirmar" is never disabled: a click while a
  save is still being sent is ignored.
- The write runs in one transaction against the `updated_at` the editor loaded and moves it
  forward. A stale save gets a 409 and changes nothing; the error toast shows the reason and the
  form stays open with what was typed.

The editor (`app/components/public/space-weather/`) is `EditableCostaRicaSection` +
`CostaRicaSectionForm`, built like `EditableHomeHero` + `HomeHeroForm`: `LanguageTabs`,
`TranslationReview`, `Modal` (portalled to `body`) and `StandardConfirmDialog` for discarding
unsaved changes. `EditableWrapper` gets only `onEdit`. The outcome of a save is a toast through
`useRequestFeedback` ([`toasts.md`](toasts.md)). The wrapper carries `page-width` so the pencil
sits on the card's corner (`.featured-section-editable` in `globals.css`, shared with the solar
physics section).

The same limitation as the home page applies: the API answers in Spanish, so an editor reading
the site in English sees the server's reasons in Spanish (the fallback in
`spaceWeather.saveErrors` and `common.feedback` is translated).

| Outcome       | Spanish                            | English                       |
| ------------- | ---------------------------------- | ----------------------------- |
| Section saved | Sección actualizada correctamente. | Section updated successfully. |

## Tests

| Layer        | File                                                             |
| ------------ | ---------------------------------------------------------------- |
| Contract     | `apps/web/app/lib/space-weather-section-schema.test.ts`          |
| Service      | `apps/web/app/lib/space-weather-section.test.ts` (Prisma mocked) |
| Editor logic | `apps/web/app/lib/space-weather-section-form.test.ts`            |
| Route        | `apps/web/app/api/space-weather/costa-rica/route.test.ts`        |
| Components   | `apps/web/app/components/public/space-weather/*.test.tsx`        |
| End to end   | `apps/web/tests/e2e/space-weather-cms.spec.ts`                   |
| Worker       | `apps/worker/tests/test_db_models.py`                            |

The end-to-end tests edit the seeded row and write it back afterwards. They never change the
card's title, which `public-portal.spec.ts` uses to find the section.
