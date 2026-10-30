# Paginating and searching a listing

How a public listing shows its items a page at a time, searched and paginated by the database,
with the page and the search in the URL. `/noticias` is the reference implementation
(LASCE-PAG-001): `getNewsPage()` in `apps/web/app/lib/news.ts`, the page in
`apps/web/app/(public)/noticias/page.tsx` and `NewsExplorer.tsx`. `/publicaciones` uses the same
pieces (`getPublicationsPage()`, `(public)/publicaciones/page.tsx`, `PublicationsExplorer.tsx`)
and adds one filter of its own, `?group=LASCE` or `?group=ROSAC`, written by
`publicationListingHref` in `apps/web/app/lib/publication-listing.ts`. An unknown group is left
out of the URL. A new search or a new group starts again from the first page. While that read is
pending, `(public)/publicaciones/loading.tsx` shows `PublicationsPageSkeleton`: the hero, the
"Publicaciones recientes" heading and the back link are catalogue copy and render for real; the
toolbar, the result line, one page of cards and the page controls are placeholders. If
`getPublicationsPage` throws, `error.tsx` shows a notice and a retry button
(`PublicationsErrorState`). The button refreshes the server render and then clears the error, so
the database is read again. A search
or a group change that is already on screen still marks the list `aria-busy` instead of swapping
in that skeleton.

`/actividades-academicas` follows the same URL and database pagination rules. Its data query is
`getAcademicActivitiesPage()` in `apps/web/app/lib/academic-activities.ts`; the page validates and
canonicalizes `?q=` and `?page=`, and `AcademicActivitiesPage.tsx` renders page controls while
preserving the search when navigating. Activity dates remain searchable in the localized format
shown on their cards.

Four pieces are shared, so another listing reuses them instead of writing its own:

| Piece                    | File                                            | What it does                                                    |
| ------------------------ | ----------------------------------------------- | --------------------------------------------------------------- |
| `PAGE_SIZE`, `paginate`  | `apps/web/app/lib/pagination.ts`                | 10 items per page; which rows to skip and take for a page       |
| `parsePageParam` & co.   | `apps/web/app/lib/pagination.ts`                | Reads `?page=`, writes listing URLs, checks a URL is canonical  |
| `parseSearchParam` & co. | `apps/web/app/lib/search-query.ts`              | Reads `?q=`; escapes `%` and `_` for a Prisma `contains` filter |
| `Pagination`             | `apps/web/app/components/public/Pagination.tsx` | The page controls                                               |

All of them are free of server-only imports, so the page, the component and the tests share them.

## The URL

| Parameter | Meaning                     | Absent means   | Example                  |
| --------- | --------------------------- | -------------- | ------------------------ |
| `q`       | Search text                 | no search      | `/noticias?q=sol`        |
| `page`    | Page of the results, from 1 | the first page | `/noticias?q=sol&page=2` |

The page size is not a parameter: it is always `PAGE_SIZE` (10), and visitors cannot change it.

`listingHref(pathname, { query, page })` writes these URLs. It leaves out page 1 and an empty
search, so the plain listing keeps its plain URL.

### Validation and canonical URLs

Both parameters are validated on the server, by the page:

- `parsePageParam` accepts only plain digits. Anything else (absent, empty, repeated, `abc`, `1.5`,
  `-2`, `0`) asks for page 1. A number too large to represent asks for the largest one.
- `paginate` then brings the page within `1..totalPages`: a page past the end becomes the last
  page. With no matching item there are no pages (`totalPages` is 0) and page 1 is shown, with no
  page indicator.
- `parseSearchParam` trims the text and cuts it to `SEARCH_MAX_LENGTH` (100) characters.

When the URL asks for something other than what is shown (`?page=0`, `?page=99` past the end,
`?page=1`, `?q=` empty, untrimmed text, a repeated parameter), the page redirects to the URL that
says what is shown. `isListingUrl(params, shown)` makes that check:

```tsx
const news = await getNewsPage(locale, {
  query: parseSearchParam(params[SEARCH_PARAM]),
  page: parsePageParam(params[PAGE_PARAM]),
})

if (!isListingUrl(params, news)) redirect(listingHref('/noticias', news))
```

The same check covers the cases where the results change under a URL that was valid: after a
language change (the search runs in the language shown, so it can match fewer items) and after an
edit (deleting the last item of the last page). The page renders again for the same URL and
redirects to the last page left.

## The query

Search, order and page are all applied by PostgreSQL, so only the rows of the page are loaded:

```ts
const where = newsSearchWhere(query, locale)
const totalItems = await prisma.news.count({ where })
const window = paginate(totalItems, page)
const records = await prisma.news.findMany({
  where,
  orderBy: newsOrder,
  skip: window.skip,
  take: window.take,
})
```

Two rules make the pages reliable:

- **The order must be total.** Rows that tie on the sort key come back in any order, so a page
  boundary can fall in a different place on every query and an item can show up twice or not at
  all. End the `orderBy` with a unique column. News sorts by `publishedAt desc` (nulls last), then
  `createdAt desc`, then `id`.
- **Escape the search text.** Prisma passes a `contains` value to `ILIKE` as it is, so `%` and `_`
  would match anything. Pass it through `escapeLikeWildcards` first.

Offset pagination (`skip` and `take`) is deliberate: it allows a page number in the URL, a total
number of pages and a jump to any page, which a cursor does not. The listings are small enough for
it to cost nothing.

### Searching translated content

A search should find what the visitor reads. For an entity made bilingual with a translation table
(see [`translate-database-content.md`](translate-database-content.md)), that means the same
fallback as `resolveContent`, written as a `where`:

- in the default locale, search the base row's columns;
- in another locale, search that locale's translation row when the record has one, and the base
  row's columns when it does not.

Columns every language shares (news sources and authors) are searched as they are.
`newsSearchWhere` in `apps/web/app/lib/news.ts` is the example.

## The `Pagination` component

```tsx
import { Pagination } from '@/app/components/public/Pagination'
import { listingHref } from '@/app/lib/pagination'

;<Pagination
  currentPage={page}
  totalPages={totalPages}
  hrefForPage={(target) => listingHref(pathname, { query, page: target })}
  label={t('page.paginationLabel')}
/>
```

| Prop          | Type                       | Default      | What it does                                                           |
| ------------- | -------------------------- | ------------ | ---------------------------------------------------------------------- |
| `currentPage` | `number`                   | required     | The page shown, from 1. Out of range shows the nearest page.           |
| `totalPages`  | `number`                   | required     | It renders nothing when this is 1 or less.                             |
| `hrefForPage` | `(page: number) => string` | required     | The URL of a page.                                                     |
| `label`       | `string`                   | "Paginación" | Names the `<nav>` landmark. Give each listing its own.                 |
| `scroll`      | `boolean`                  | `true`       | Passed to every `<Link>`. `false` when the listing moves focus itself. |
| `className`   | `string`                   |              | Added to the `<nav>`.                                                  |

What it renders:

- "Anterior" and "Siguiente", dimmed and not links on the first and last page.
- The page numbers, with gaps once there are more than 7 pages: `1 … 5 6 7 … 12`. It always shows
  7 items then, so the controls keep their width (`pageItems`).
- The current page highlighted, with `aria-current="page"`. Every number is named "Página N".
- Below 600px, "Página 6 de 12" between the arrows instead of the numbers; below 420px the arrows
  lose their text, which stays for assistive technology.

Every page is a real link, so back and forward, reloading and opening a page in a new tab work
with no script of their own, and the component renders on the server too. Its fixed text is in
`common.pagination` in both catalogues.

### Moving focus

After following a page link at the bottom of a list, focus would stay on that link. `NewsExplorer`
passes `scroll={false}` and moves focus to the list's heading (`tabIndex={-1}`) whenever the page
changes, so keyboard and screen reader users start reading the new items. The heading has a
`scroll-margin-top` so the sticky header does not cover it.

## The search box

`NewsExplorer` keeps what is typed in its own state and moves it to the URL once typing pauses for
`SEARCH_DELAY_MS` (300 ms), or at once on Enter. A new search starts from page 1 and replaces the
URL instead of adding a history entry. When the URL changes without the box (back, forward, a
link), the box shows the URL's search, unless it already says the same with spaces around it.

## Tests

| What                                    | Where                                                                  |
| --------------------------------------- | ---------------------------------------------------------------------- |
| Page parsing, windows, URLs             | `apps/web/app/lib/pagination.test.ts`                                  |
| Search text, wildcard escaping          | `apps/web/app/lib/search-query.test.ts`                                |
| The component                           | `apps/web/app/components/public/Pagination.test.tsx`                   |
| The news query, against a real database | `apps/web/tests/integration/news.test.ts`                              |
| The academic activities query           | `apps/web/app/lib/academic-activities.test.ts`                         |
| The publications query, the same way    | `apps/web/tests/integration/publications.test.ts`                      |
| News, in a browser                      | `apps/web/tests/e2e/news-pagination.spec.ts`                           |
| Publications, in a browser              | `apps/web/tests/e2e/publications-pagination.spec.ts`                   |
| Publications, loading and a failed read | `PublicationsPageSkeleton.test.tsx`, `PublicationsErrorState.test.tsx` |

The news seed has more than 10 items, so an e2e test that creates an undated item (listed last)
searches for it to find it, rather than expecting it on page 1. The publications seed fits on one
page, so `publications-pagination.spec.ts` creates its own 23 items and searches for them.
