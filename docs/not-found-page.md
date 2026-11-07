# 404 page

The app-level `apps/web/app/not-found.tsx` renders `NotFoundPage.tsx` for page URLs that
cannot be resolved. This is separate from `ErrorBoundary`: a missing route is an
intentional not-found state, while `ErrorBoundary` contains an unexpected render
failure inside part of an existing page. API route handlers keep their own response
behavior and do not render this page.

`NotFoundPage.tsx` uses the shared topic-page layout and provides a link back to `/`.
Its browser-tab title, heading, description, and 404 label come from the `notFound`
message catalogue; the link label comes from `common.backToHome`. Both English and
Spanish catalogues are supported, following the site's selected language.

## 404 components

- **`not-found.tsx`** is the Next.js file convention for the not-found UI. It loads
  the `notFound` and `common` translations, exports `generateMetadata` for the tab
  title, and renders `NotFoundPage`.
- **`notFound()`** (from `next/navigation`) throws to signal a missing resource, so
  code after it does not run. Call it when a lookup returns nothing, for example a
  `noticias/[slug]` whose slug does not exist. Next.js then renders the closest
  `not-found.tsx` with a 404 status.
- **`app/(public)/[...rest]/page.tsx`** is the public catch-all. It renders nothing
  and only calls `notFound()`.

## catch-all

Next.js renders `not-found.tsx` inside the layouts of the segment that threw
`notFound()`. A URL that matches no route, such as `/nosotros/does-not-exist`, would
skip `(public)/layout.tsx` and show the 404 without the public header and footer.
Because the catch-all sits inside `(public)`, unmatched URLs at any depth get the
same layout as the rest of the site. Existing routes are unaffected, since static
and dynamic routes take precedence over catch-all routes.
