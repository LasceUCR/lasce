# Gallery

How `/galeria` is built, and the rules for adding a file to it. The content is still mock data in
[`apps/web/app/lib/gallery.ts`](../apps/web/app/lib/gallery.ts); the images under
`apps/web/public/images/galeria/` are public-domain NASA stand-ins, documented in the README beside
them. Wiring in a real source (Postgres rows plus MinIO objects) is a change to that one module.

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
            └─ MediaLightbox      native <dialog>    h2 + figure/figcaption, real alt
```

| Piece                 | File                                            | Covered by                     |
| --------------------- | ----------------------------------------------- | ------------------------------ |
| Mock data and helpers | `app/lib/gallery.ts`                            | `app/lib/gallery.test.ts`      |
| Index page            | `app/components/public/gallery/GalleryPage.tsx` | `GalleryPage.test.tsx`         |
| One album block       | `…/GalleryGroupSection.tsx`                     | `GalleryGroupSection.test.tsx` |
| Album / sub-album     | `…/AlbumPage.tsx`                               | `AlbumPage.test.tsx`           |
| Album cover tile      | `…/AlbumTile.tsx`                               | `AlbumTile.test.tsx`           |
| Masonry grid          | `…/AlbumMediaGrid.tsx`                          | `AlbumMediaGrid.test.tsx`      |
| Framed image          | `…/MediaFrame.tsx`                              | `MediaFrame.test.tsx`          |
| Full-screen view      | `…/MediaLightbox.tsx`                           | `MediaLightbox.test.tsx`       |

Routes, the sitemap and the axe sweep all derive their album lists from `galleryAlbumList`, so a new
album is picked up by `app/lib/site.ts` and `tests/e2e/accessibility-seo.spec.ts` without any edit
there.

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
  in jsdom, so the component falls back to setting the `open` attribute and the tests stub it.
- **Focus rings are not styled here.** `globals.css` sets one global
  `:focus-visible { outline: 3px solid var(--action) }`, and `--action` is inherited from the
  surface, so the ring is amber inside the lightbox and dark blue on the index. See
  [color-palette.md](color-palette.md); do not override it per component.

## Known gaps

- The data is mock. There is no gallery table in `packages/db/prisma/schema.prisma`; when one is
  added, `imageAlt` on `News` is the precedent for a required alt column.
- A video entry renders its still image and never a `<video>`, so `isVideo` only drives the badge
  and the placeholder caption.
- `hank-bb.webp` is the one image with no provenance row in
  `apps/web/public/images/galeria/README.md`, and its alt text was written without sight of the
  file. Both need a look from someone who can see it.
- `/galeria/[slug]/[subalbum]/page.tsx` composes its own summary line instead of using
  `albumMediaMeta()`, because it also names the parent album.
