import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// #403: `/galeria`, `/galeria/[slug]` and `/galeria/[slug]/[subalbum]` gained a `loading.tsx` and
// an `error.tsx`, built from the shared `Skeleton` primitive (`docs/skeletons.md`). Unlike
// `/datos`'s own skeleton-loading.spec.ts, these pages fetch their data inside a Server
// Component rather than from the client, so there is no discrete request Playwright can hold to
// force the transient loading state into view without either slowing the database itself or
// racing a fast, non-deterministic compile/query time. That transient state, and the error
// state's shape, are covered deterministically instead at the component level
// (GalleryPageSkeleton.test.tsx, AlbumPageSkeleton.test.tsx, GalleryErrorState.test.tsx, plus the
// shared Skeleton.test.tsx for the shimmer, reduced motion and forced-colors behaviour). What
// this spec adds is the one thing only a real browser against the real routes can confirm: that
// adding those files left the actual pages accessible, which `public-portal.spec.ts` did not yet
// check for the gallery.

test('passes WCAG A and AA automated checks on the gallery index', async ({ page }) => {
  await page.goto('/galeria')
  await expect(page.getByRole('heading', { level: 1, name: 'Galería' })).toBeVisible()

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(results.violations).toEqual([])
})

test('passes WCAG A and AA automated checks on an album page', async ({ page }) => {
  await page.goto('/galeria/rosac')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(results.violations).toEqual([])
})
