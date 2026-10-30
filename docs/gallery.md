# Gallery

How `/galeria` is built, and the rules for adding a file to it. The initial albums, sub-albums and
media are declared in [`apps/web/app/lib/gallery.ts`](../apps/web/app/lib/gallery.ts) and inserted into PostgreSQL by `pnpm db:seed`. The seed stores the existing `/images/galeria/` paths as object keys; these assets remain served from the web app's public directory rather than being uploaded to
MinIO.

## The shape

```
/galeria                          GalleryPage        h1 "Galería"
  └─ GalleryGroupSection          section + h2       one block per album
       ├─ ul.gallery-carousel-track › li   image button, optional edit controls
       │    └─ MediaLightbox      full-screen image viewer
       └─ team-gallery-controls   previous/next + "Ver álbum"
/galeria/[slug]                   AlbumPage          h1 album title
  ├─ TopicSection "Subálbumes"    h2
  │    └─ ul.card-grid › li       AlbumTile          h3, cover alt=""
  └─ TopicSection "Fotografías…"  h2
       └─ ul.media-grid › li      AlbumMediaGrid     button per file, image alt=""
            └─ MediaLightbox      composes Lightbox  h2 + figure/figcaption, real alt
                 └─ Lightbox      native <dialog>    shared shell, also used by /datos

loading.tsx (every route above)   GalleryPageSkeleton / AlbumPageSkeleton — placeholders only
                                   for the database-backed parts; static copy renders for real
error.tsx (/galeria, bubbles up)  GalleryErrorState — a Notice and a "Reintentar" button
```

| Piece                 | File                                                                                   | Covered by                     |
| --------------------- | -------------------------------------------------------------------------------------- | ------------------------------ |
| Mock data and helpers | `app/lib/gallery.ts`                                                                   | `app/lib/gallery.test.ts`      |
| Gallery write actions | `app/lib/gallery.ts`                                                                   | `app/lib/gallery.test.ts`      |
| Index page            | `app/components/public/gallery/GalleryPage.tsx`                                        | `GalleryPage.test.tsx`         |
| One album block       | `…/GalleryGroupSection.tsx`                                                            | `GalleryGroupSection.test.tsx` |
| Album / sub-album     | `…/AlbumPage.tsx`                                                                      | `AlbumPage.test.tsx`           |
| Album cover tile      | `…/AlbumTile.tsx`                                                                      | `AlbumTile.test.tsx`           |
| Masonry grid          | `…/AlbumMediaGrid.tsx`                                                                 | `AlbumMediaGrid.test.tsx`      |
| Framed image          | `…/MediaFrame.tsx`                                                                     | `MediaFrame.test.tsx`          |
| Full-screen view      | `…/MediaLightbox.tsx`                                                                  | `MediaLightbox.test.tsx`       |
| Dialog shell          | `app/components/public/Lightbox.tsx`                                                   | `Lightbox.test.tsx`            |
| Index page, loading   | `galeria/loading.tsx` → `…/GalleryPageSkeleton.tsx`                                    | `GalleryPageSkeleton.test.tsx` |
| Album pages, loading  | `galeria/[slug]/loading.tsx`, `.../[subalbum]/loading.tsx` → `…/AlbumPageSkeleton.tsx` | `AlbumPageSkeleton.test.tsx`   |
| A failed load         | `galeria/error.tsx` → `…/GalleryErrorState.tsx`                                        | `GalleryErrorState.test.tsx`   |

The album pages and the sitemap read the database: `getGalleryAlbums` serves the routes and
`getGalleryPaths` feeds `getPublicPaths()` in `app/lib/site.ts`, so a new album appears in
`/sitemap.xml` and a deleted one drops out. `galleryAlbumList` is only seed data
(`packages/db/prisma/seed.ts`) and the fixture for the tests; the e2e specs run against the seeded
albums, so they need `pnpm db:seed` first.

## Gallery overview carousel

Each top-level album on `/galeria` has a horizontal carousel of up to 10
featured images. It collects eligible images from the top-level album first, then its sub-albums,
preserving each album's media order. Videos and media without an image source are excluded. The
limit applies to featured images; it does not count the edit-mode add-image card.

The overview no longer shows album or sub-album cover tiles. The previous and next controls sit
below the carousel and scroll its native horizontal track; the adjacent **Ver álbum** button opens
the top-level album page. Selecting a featured image opens the full-screen lightbox, with previous
and next image navigation, Escape to close, and focus returned to the image trigger on close.

When edit mode is active, users with the relevant permissions can edit or delete the album from its
heading and edit or delete featured media using the editable wrappers. The add-image card appears
only when the user can create content and an uploader is available; it adds media to the
top-level album. Featured images from sub-albums retain their owning album, so editing one submits
the update to the correct album. Album and sub-album cover tiles remain on album detail pages; the
image-only carousel applies only to the gallery overview.

## Loading and error states

Every route here (`/galeria`, `/galeria/[slug]`, `/galeria/[slug]/[subalbum]`) is
`force-dynamic`: it reads the database directly in a Server Component, with no client-side fetch
to show a spinner around. Next's own `loading.tsx` fills that gap — it is shown while the Server
Component's render is pending and swapped automatically for the real page once it resolves — and
`error.tsx`, placed once at the `/galeria` segment, catches a thrown `getGalleryAlbums` (a database
failure) for the whole subtree, since the nested routes define no `error.tsx` of their own. Both
reuse the shared `Skeleton` primitive from `docs/skeletons.md`, not a gallery-specific one: see
that doc for why the gallery's placeholders cannot use `LoadingRegion` the way `/datos` does.

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

- **Album covers and carousel/grid thumbnails are `alt=""`.** Album covers sit inside a tile link
  that already names the album. Carousel and grid thumbnails sit inside buttons labelled
  `Ver a tamaño completo: <title>`. A described thumbnail there would repeat the control's name.
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
- **A missing album or sub-album answers `200`, not `404`.** `loading.tsx` streams the response as
  soon as it starts, which commits the status to `200` before `notFound()` runs anywhere in that
  subtree — a Next.js limitation (confirmed against a production build, not a dev-mode artefact),
  not something this page's code controls. The content is still the correct "This page could not
  be found." page; only the HTTP status is wrong. Accepted deliberately so album and sub-album
  pages keep their loading skeleton (#403); see the comment above the two affected tests in
  `tests/e2e/public-portal.spec.ts`. Removing every `loading.tsx` in the `/galeria` tree restores
  the real `404`, at the cost of the skeleton.
