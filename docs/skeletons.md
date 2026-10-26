# Skeleton loading states

How a view shows placeholders shaped like its content while that content loads (#377), instead of
an empty area, a spinner or a lone "Cargando…". The shared pieces are in
`apps/web/app/components/public/skeleton/`. `/datos` is where they first shipped: "Sol hoy", each
solar image, and the results of an instrument query. `/galeria` (#403) is the second consumer, and
a different one: it has no client-side loading state to toggle, so it reaches for the plain
`Skeleton` shape directly rather than `LoadingRegion` — see "Where it is used" below.

## The pieces

| Component           | Stands in for                                                              |
| ------------------- | -------------------------------------------------------------------------- |
| `Skeleton`          | One shape: `block`, `text` (a line) or `circle`; a size or an aspect ratio |
| `SkeletonText`      | A paragraph of N lines, the last one shorter                               |
| `SkeletonImageCard` | One card of `.data-image-grid`: a dark square frame and its caption        |
| `SkeletonChart`     | A time-series result: the `.data-summary` tiles and the chart              |
| `LoadingRegion`     | The area that loads: placeholders while loading, then what loaded          |

`Skeleton` takes `tone="dark"` on dark surfaces, such as the frames of solar images.

## Using it

```tsx
import { LoadingRegion } from '@/app/components/public/skeleton/LoadingRegion'
import { SkeletonImageCard } from '@/app/components/public/skeleton/SkeletonImageCard'

;<LoadingRegion
  label={t('loading')}
  loading={state === 'loading'}
  skeleton={
    <ul className="data-image-grid">
      {Array.from({ length: 5 }, (_, index) => (
        <li key={index}>
          <SkeletonImageCard />
        </li>
      ))}
    </ul>
  }
>
  {state === 'error' ? (
    <Notice tone="error" role="alert">
      {t('error')}
    </Notice>
  ) : (
    <Content />
  )}
</LoadingRegion>
```

Three rules keep the transition still:

- **Draw the placeholders inside the content's own layout.** Put `SkeletonImageCard`s in the same
  grid the images use, and the same number of them, so the grid has its final size while loading.
  Custom shapes can use the content's own classes too: `ScientificResultsSkeleton` reuses
  `.data-results`, `.data-section-heading` and `.data-metadata`.
- **Keep `LoadingRegion` mounted from loading to loaded.** Render it while loading _and_ once the
  content is there, and choose between the content, the empty state and the error inside it. Its
  element stays in place, so only its children change.
- **End every load.** `loading` must become false on success, on an empty answer, on a failure and
  on a cancel; `LoadingRegion` cannot tell a slow request from one that will never end.

### A Server Component with no client-side state: `loading.tsx` and `error.tsx`

`LoadingRegion` assumes a `loading` boolean the caller toggles, which fits a client component
fetching its own data. A page that instead reads the database directly in a Server Component (as
`/galeria`'s do, all `force-dynamic`) has no such boolean — the only "loading" moment is Next's own
Suspense boundary around that component's render, shown through the route's `loading.tsx` while it
is pending and swapped automatically for the real page once it resolves. There, a page composes
`Skeleton` (and `SkeletonText`) directly into its own markup — `GalleryPageSkeleton.tsx` and
`AlbumPageSkeleton.tsx` are the reference — with a `role="status"` paragraph of its own standing in
for `LoadingRegion`'s announcement, since there is no single mounted element to attach it to across
the loading/loaded swap. A thrown `getGalleryAlbums` is caught the same native way, by the route's
`error.tsx`, which never reuses the skeleton: it renders a `Notice tone="error"` and a retry button
instead (`GalleryErrorState.tsx`).

## Accessibility

`LoadingRegion` does what the acceptance criteria ask, so each view does not have to:

- it is `aria-busy` while loading and not after;
- a polite status announces `label` (or `common.loading`, "Cargando…" / "Loading…"). The status
  region is always mounted, because a screen reader only announces a change to an existing one.
  Pass `announce={false}` when something else already announces the load, as the query's progress
  bar does, so it is not heard twice;
- the placeholders are `aria-hidden` and `inert`: nothing in them can be focused or read.

Each shape is decorative: no role, no text, no tab stop. The shimmer stops under
`prefers-reduced-motion`, and under `forced-colors` the shapes get an outline, since high contrast
mode drops their background.

A placeholder that stands in for one element rather than an area (a solar image whose file is
still downloading, in `SuviImageSequence`) uses `Skeleton` directly: the frame is `aria-busy` and
its loading message stays for screen readers only, while the placeholder fills the frame.

## Where it is used

| View                                               | File                                                      | Placeholder                                                               |
| -------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------- |
| "Sol hoy" on `/datos`                              | `scientific-data/SolarToday.tsx`                          | 5 `SkeletonImageCard`s in the strip                                       |
| Each solar image                                   | `scientific-data/SuviImageSequence.tsx`                   | A dark `Skeleton` filling the frame                                       |
| An instrument query result                         | `scientific-data/ScientificResultsSkeleton.tsx`           | Heading, metadata, and a chart or image grid, by product                  |
| `/galeria`                                         | `gallery/GalleryPageSkeleton.tsx`                         | The static hero renders for real; album groups get `GalleryTileSkeleton`s |
| `/galeria/[slug]` and `/galeria/[slug]/[subalbum]` | `gallery/AlbumPageSkeleton.tsx`                           | Hero text, sub-album tiles (top-level album only) and the media grid      |
| Every `/galeria` route's data fetch failing        | `gallery/GalleryErrorState.tsx` (via `galeria/error.tsx`) | A `Notice` and a "Reintentar" button                                      |

## Tests

- The components: `skeleton/*.test.tsx`, and the Gallery's own
  `gallery/GalleryTileSkeleton.test.tsx`, `MediaTileSkeleton.test.tsx`,
  `GalleryPageSkeleton.test.tsx`, `AlbumPageSkeleton.test.tsx` and `GalleryErrorState.test.tsx`.
- Each view's loading, result, empty and error states: `SolarToday.test.tsx`,
  `SolarTodayLive.test.tsx`, `SuviImageSequence.test.tsx`, `ScientificDataExplorer.test.tsx`.
- In a browser: `tests/e2e/skeleton-loading.spec.ts` for `/datos` (data API answered by the test;
  layout from 320 to 1440 px, reduced motion, focus and axe), `tests/e2e/gallery-skeleton.spec.ts`
  for `/galeria` (the page's own document request delayed and then failed, same checks).
