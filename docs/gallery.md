# Gallery

How `/galeria` is built, and the rules for adding a file to it. The initial albums, sub-albums and
media are declared in [`apps/web/app/lib/gallery.ts`](../apps/web/app/lib/gallery.ts) and inserted into PostgreSQL by `pnpm db:seed`. The seed stores the existing `/images/galeria/` paths as object keys; these assets remain served from the web app's public directory rather than being uploaded to
MinIO.

## The shape

```
/galeria                          GalleryPage        h1 "Galería"
  └─ GalleryGroupSection          section + h2       one block per album
       └─ ul.gallery-grid › li    AlbumTile          h3, cover alt=""
/galeria/[slug]                   AlbumPage          h1 album title
  ├─ TopicSection "Subálbumes"    h2
  │    └─ ul.card-grid › li       AlbumTile          h3, cover alt=""
  └─ TopicSection "Fotografías…"  h2
       └─ ul.media-grid › li      AlbumMediaGrid     button per file, image alt=""
            └─ MediaLightbox      composes Lightbox  h2 + figure/figcaption, real alt
                 └─ Lightbox      native <dialog>    shared shell, also used by /datos
```

| Piece                 | File                                            | Covered by                     |
| --------------------- | ----------------------------------------------- | ------------------------------ |
| Mock data and helpers | `app/lib/gallery.ts`                            | `app/lib/gallery.test.ts`      |
| Gallery write actions | `app/lib/gallery.ts`                            | `app/lib/gallery.test.ts`      |
| Index page            | `app/components/public/gallery/GalleryPage.tsx` | `GalleryPage.test.tsx`         |
| One album block       | `…/GalleryGroupSection.tsx`                     | `GalleryGroupSection.test.tsx` |
| Album / sub-album     | `…/AlbumPage.tsx`                               | `AlbumPage.test.tsx`           |
| Album cover tile      | `…/AlbumTile.tsx`                               | `AlbumTile.test.tsx`           |
| Masonry grid          | `…/AlbumMediaGrid.tsx`                          | `AlbumMediaGrid.test.tsx`      |
| Framed image          | `…/MediaFrame.tsx`                              | `MediaFrame.test.tsx`          |
| Full-screen view      | `…/MediaLightbox.tsx`                           | `MediaLightbox.test.tsx`       |
| Dialog shell          | `app/components/public/Lightbox.tsx`            | `Lightbox.test.tsx`            |

The album pages and the sitemap read the database: `getGalleryAlbums` serves the routes and
`getGalleryPaths` feeds `getPublicPaths()` in `app/lib/site.ts`, so a new album appears in
`/sitemap.xml` and a deleted one drops out. `galleryAlbumList` is only seed data
(`packages/db/prisma/seed.ts`) and the fixture for the tests; the e2e specs run against the seeded
albums, so they need `pnpm db:seed` first.

## Album translations

The Prisma schema includes `GalleryAlbumTranslation` (`gallery.gallery_album_translations`) for
the translated `title`, `description` and optional `yearsLabel`. The base `GalleryAlbum` row keeps
the source-language text; each translation row is keyed by album and locale. The album `slug`,
cover image, parent/child hierarchy and media remain shared across languages. Deleting an album
cascades to its translation rows.

Albums are read and written bilingually, like publications: `getGalleryAlbums(locale, { includeEditingData })`
resolves the text for the visitor's language (falling back to the base row) and, for editors, also
returns every stored language and a `version` token. Existing albums with no translation row only
have base text, whose language may be unknown. The `locale` column is a string (not a database
enum), so supported locale validation belongs to the application.

Media text is bilingual the same way: `GalleryMediaTranslation`
(`gallery.gallery_media_translations`) holds `title`, `description` and `altText` per additional
locale, and editors receive `GalleryMedia.editing` (every language plus `version`).

## Album period

The editor picks an album's period with selects rather than free text: a start year and month, and
an optional end year and month (`AlbumForm`). `app/lib/gallery-period.ts` turns the choice into the
same display string the column always held, so `yearsLabel` and the API are unchanged: `2019–2023`,
`febrero 2026`, `marzo 2024–junio 2025`. Month names are stored in Spanish, the shared row's
language, and shown in the visitor's language (`localizeYearsLabel`, so `February 2026` in English);
the editor reads either back. An end equal to the start collapses to one point. A stored label in any other shape
is kept as it is, with a notice, until the editor chooses a new period.

## API

- `POST /api/gallery/albums` and `POST /api/gallery/albums/{albumId}` (sub-album) require
  `create_components` and accept `slug`, `content` (`title` and `description` in both `es` and
  `en`), and optional `yearsLabel` and `coverObjectKey`. They return `201`, `404`/`400` for a missing
  or non-top-level parent, and `409` for a duplicate slug.
- `PATCH /api/gallery/albums/{albumId}` requires `edit_components` and accepts the `version` the
  editor loaded plus one or more of `content`, `slug`, `yearsLabel` and `coverObjectKey`. A field
  changed in one language only must be confirmed through `confirmedUnchanged` (otherwise `409`
  `review-required`). Omitted fields are left untouched and `null` clears `yearsLabel` or
  `coverObjectKey`. It returns the updated album with `200`, `404` when missing, and `409` for a
  stale `version` (`conflict`) or a duplicate slug. Errors use the `{ error, code }` envelope.
- `DELETE /api/gallery/albums/{albumId}` requires `delete_components` and removes the album and its
  sub-albums and media records through the database cascade. It does not delete associated assets
  from MinIO or another asset store. A successful delete returns `204`; an unknown album returns
  `404`.
- `POST /api/gallery/albums/{albumId}/media` accepts `content` (`title`, `description` and
  `altText` in both `es` and `en`), `objectKey`, `format`, `date` (ISO `YYYY-MM-DD`) and
  `uploader`, with optional `isVideo`, `colSpan`, and `rowSpan`. It requires `create_components`, assigns the first position in the album, and returns
  the created media with status `201`.
- `DELETE /api/gallery/media/{mediaId}` requires `delete_components` and removes only the database
  record. It does not delete the associated file from MinIO or another asset store. A successful
  delete returns `204`.
- `PATCH /api/gallery/media/{mediaId}` requires `edit_components` and accepts the `version` the
  editor loaded plus one or more of `content`, `confirmedUnchanged` and the shared fields from the
  create payload, with the same review rule as albums. It returns the updated media record with
  `200`, `404` when missing, and `409` for a stale `version` (`conflict`) or `review-required`; an
  update without changes is rejected.

## Alt text

`GalleryMedia.alt` is **required**, and every value comes from the `mediaAlt` table at the top of
`gallery.ts`, which is keyed by **image file** rather than by entry. That is not an accident: 61
entries share 37 files, so two entries pointing at the same photograph must describe it identically.
`gallery.test.ts` enforces it.

The house rules:

1. Spanish, one sentence, sentence case, ends with a period.
2. Describe what is visible — subject, action, setting. Never repeat `title` or `description`.
3. Never open with "Foto de", "Imagen de" or "Fotografía que muestra": the image role already says
   it is an image.
4. For a video entry, describe the still. Do not say "video" — the play badge already carries an
   `sr-only` "Video" label.
5. Name a person only if their name is in visible copy; otherwise "una persona del equipo".
6. Never `''` in the data. An empty alt is a **call-site** decision, never a data value.

## Accessibility decisions, and why

These are deliberate. Please do not "fix" them back.

- **Album covers and grid thumbnails are `alt=""`.** In both places the image sits inside a control
  that already names it: the album tile is one link wrapping the `h3` and the meta line, and each
  grid tile has an overlay button labelled `Ver a tamaño completo: <title>`. A described image there
  makes a screen reader say the same thing twice, sixty times over on a large album.
- **The lightbox image carries the real alt.** It is the one place the photograph is the content
  rather than a thumbnail of a link.
- **Media titles are not headings.** Album and sub-album tiles are `h3`, but the per-file titles stay
  paragraphs. An album page would otherwise gain sixty sibling `h3`s, every one of them text that is
  `opacity: 0` until the tile is hovered or focused — a heading outline that cannot be used to
  navigate is worse than none.
- **No `figure`/`figcaption` in the media grid.** `.media-hover` is revealed only on
  `:hover`/`:focus-within`, so it is a reveal rather than a caption the image always carries, and a
  `figure` would take its accessible name from it and duplicate the tile's button. The lightbox,
  whose caption is always visible, does use `figure`/`figcaption`.
- **The lightbox is a native `<dialog>` opened with `showModal()`.** The focus trap, Escape, the
  inert background and the stacking all come from the top layer instead of being hand-rolled. Arrow
  key paging is the only keyboard behaviour this component implements itself. `showModal` is absent
  in jsdom, so the component falls back to setting the `open` attribute and the tests stub it. That
  behaviour lives in the shared `Lightbox` shell, which takes all of its copy as props;
  `MediaLightbox` supplies the gallery's Spanish wording and the stage, and `/datos` reuses the
  shell for solar images (`SolarImageLightbox`).
- **Focus rings are not styled here.** `globals.css` sets one global
  `:focus-visible { outline: 3px solid var(--action) }`, and `--action` is inherited from the
  surface, so the ring is amber inside the lightbox and dark blue on the index. See
  [color-palette.md](color-palette.md); do not override it per component.

## Known gaps

- A video entry renders its still image and never a `<video>`, so `isVideo` only drives the badge
  and the placeholder caption.
- `hank-bb.webp` is the one image with no provenance row in
  `apps/web/public/images/galeria/README.md`, and its alt text was written without sight of the
  file. Both need a look from someone who can see it.
- `/galeria/[slug]/[subalbum]/page.tsx` composes its own summary line instead of using
  `albumMediaMeta()`, because it also names the parent album.
