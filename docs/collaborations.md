# Collaborations and initiatives

How `/colaboraciones-e-iniciativas` is built. Partner organizations are read from PostgreSQL by
[`collaboration-records.ts`](../apps/web/app/lib/collaboration-records.ts). The route resolves
their country text using the visitor's `lasce_locale` cookie and the shared database-content
helpers. Initiatives are also read from PostgreSQL through
[`initiative-records.ts`](../apps/web/app/lib/initiative-records.ts), with bilingual titles and
descriptions, optional logos and official links. Their migration preserves ISWI and IVIA in both
languages. Fixed interface text remains in `apps/web/messages/`; the former initiative catalogue
items remain historical fixtures. See [initiatives.md](initiatives.md) for the initiative CMS.

The public reading and persistence portion of LASCE-PUB-002 is extended by the collaboration CMS
(LASCE-CON-012). Authorized editors manage organizations in place through Modo edición. The static organization list in
[`research-collaborations.ts`](../apps/web/app/lib/research-collaborations.ts) is a fixture for
stories and tests, not a second public data source.

## Translation mapping

| Content                                                      | Source                                                                              | Localization                                                               |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Metadata, hero, section heading, description and empty state | `collaborations.meta`, `.hero`, `.section`                                          | Spanish/English catalogues                                                 |
| National/international badge and acronym label               | `collaborations.card`                                                               | Stable scope maps to a catalogue key                                       |
| Organization's country                                       | `research.collaborations.country` and `research.collaboration_translations.country` | Spanish base row, English translation keyed by collaboration id and locale |
| Official organization name, acronym, scope and display order | `research.collaborations`                                                           | Shared, never translated                                                   |
| Initiative title and description                             | `research.initiatives` and `research.initiative_translations`                       | Spanish base row and English translation                                   |
| Initiative logo URLs and official website URLs               | `research.initiatives`                                                              | Shared, never translated                                                   |
| Initiative controls, website label and empty state           | `initiatives` catalogue namespace                                                   | Spanish/English catalogues                                                 |
| Back link label                                              | `common.backToHome`                                                                 | Spanish/English catalogues                                                 |

Country is the only translatable text field in the current organization card. The optional
organization website URL is a shared field; initiative logos and
websites remain independent. `collaborationContent` defines the country with
`defineTranslatableContent`, so the editor uses the same bilingual validation and review
helpers as publications without treating official organization names as translated text.

The public query fetches the directory and its supported translations in one Prisma call and
preserves `position` order (with `id` as a stable tie-breaker). It exposes only resolved public
fields. Missing translation rows fall back to the base country via `storedContentFrom` and
`resolveContent`. As with publications, legacy base text has an unknown language, so only the
country span receives `lang=""`; translated countries receive `lang="es"` or `lang="en"`.
Fixed UI keys retain the catalogue's Spanish fallback. Switching languages re-renders the same
URL; neither organization identity nor classification depends on translated labels.

## Migration and validation

Apply `20261013120000_add_collaboration_translations`,
`20261014120000_add_collaboration_media`, and
`20261014130000_drop_collaboration_logo_url` before running the updated page:

```bash
pnpm db:generate
pnpm db:migrate:deploy
```

The migration creates the two tables and copies the eight existing organizations, their order,
and their existing Spanish/English country labels in one transaction. No separate seed run is
needed. The media migration originally added nullable `logo_url` and `website_url` columns.
The follow-up migration removes the unused `logo_url` column while retaining `website_url`.
It also removes any values stored in that placeholder column. The earlier migration remains
unchanged to preserve migration history; collaboration logo uploads are deferred.
Restart `pnpm dev` after generating Prisma so its cached client
knows the new fields. Translation rows are unique by `(collaboration_id, locale)` and are deleted with their
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
- `websiteUrl`: optional HTTP(S) URL; empty values are stored as null.

Organization logos are deferred. A later implementation will allow image uploads (such as PNG)
and display them on organization cards; the current editor does not accept a logo URL.
The existing gallery storage pattern keeps the file in MinIO and stores its object key as text
in the database. That key identifies an uploaded file; it is not a URL entered by an editor.

New organizations and changed translations appear on the next request without editing the
catalogues or deploying. Management follows the bilingual write, permission, transaction and review rules in
`translate-database-content.md`.

## Managing organizations

Enable **Modo edición** and open `/colaboraciones-e-iniciativas`. The server supplies create,
edit and delete permissions independently, using the existing `*_components` permission matrix.
Only users with edit permission receive bilingual editing metadata and the version token.

`CollaborationsManager` connects the existing `AddItemCard`, `EditableWrapper`, `Modal` and
`useRequestFeedback`. `CollaborationForm` is shared by creation and editing and uses `FormField`,
`LanguageTabs`, `TranslationReview` and `StandardConfirmDialog`. Cancelling a changed form asks
before discarding; a failed request leaves its values intact and reports the reason in a toast.
The editor labels, validation and feedback follow the site's language. Countries are entered
in Spanish and English; official organization names and acronyms are shared.

`/api/collaborations` provides public GET and guarded POST; `/api/collaborations/[id]` provides
guarded PATCH and DELETE. Server validation rejects blank required values, invalid scope,
unsupported properties, and URLs outside HTTP(S) or containing credentials. A shared-only PATCH
leaves omitted fields and translations untouched. Empty optional fields clear the stored value.
Creates and edits are transactional, edits require the loaded `updatedAt` version, and one-sided
country changes require review. Deletion cascades to translations, with confirmation in the UI.

The public cards retain their responsive layout, order and national/international classification.
External links use `noopener noreferrer`. ISWI and IVIA
remain outside this CMS.

Validation lives beside the form, routes, schema and writes. `collaboration-cms.test.ts` in the
integration suite checks real persistence, concurrent edits and rollback on translation failure
against a disposable `*_test` database. `collaboration-cms.spec.ts` exercises the CRUD workflow,
permission boundaries, accessibility and mobile editing in Playwright.

## Managing initiatives

Enable edit mode on the public page using an account with the corresponding content permission.
Choose **Añadir iniciativa**, enter the title and description in Spanish and English, and optionally
set the logo URL and official website. Save with **Confirmar**. Existing initiative cards expose
edit and delete controls according to each permission; deletion requires confirmation.

Initiative content is stored in the database. Do not add production initiatives to
`getCollaborationsContent` or the historical catalogue fixtures. See
[initiatives.md](initiatives.md) for validation, translation review, concurrency and migration details.

A card without a logo is a single text column; a missing website omits its button. The section
heading remains fixed interface copy under `collaborations.initiatives.title`.
