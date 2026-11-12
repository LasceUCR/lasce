# Administration navigation

The menu of `/administracion` (LASCE-ADM-002-148): which sections it offers, how it follows the
permission matrix, and how it behaves on narrow screens. Covers `AdminShell.tsx`,
`AdminSidebar.tsx`, `lib/admin-sections.ts` and the `administracion` layout.

## One catalogue for the menu and the routes

`apps/web/app/lib/admin-sections.ts` declares each section once: slug, title, description and the
grant its page requires. `(public)/administracion/[section]/page.tsx` reads it for
`generateStaticParams`, the metadata and the `requirePermission` fallback; `AdminShell` reads
`adminMenu` (Resumen first, then the sections in sidebar order) for the links. Resumen is
`/administracion` itself and is not a catalogue slug, so `/administracion/resumen` does not
resolve. Adding a section means one entry there plus, when the page needs more than the
placeholder, a branch in `[section]/page.tsx`.

## Who enters, and what the menu offers

`apps/web/app/(public)/administracion/layout.tsx` is the layout of the protected section, not the
shared `(public)` one, so it may read the session ([sessions.md](sessions.md)). It gates the whole
panel and then builds the menu:

1. `requireUser('/administracion')` sends an anonymous visitor to `/acceso` and back to the panel.
2. `canSeeAdminNavigation(role)`, the same rule that hides the header tab, turns a signed-in
   visitor away with Acceso denegado. Only assistants and administrators continue.
3. `getPermissionsForRole()` (memoised per request) gives the held grants, passed to `AdminShell`
   as `granted`. `visibleAdminMenu(granted)` keeps the entries without a grant (just Resumen today)
   and those whose grant is held.

With the default matrix:

| Viewer        | Result                                                 |
| ------------- | ------------------------------------------------------ |
| Anonymous     | Redirect to `/acceso?next=/administracion&reason=auth` |
| Visitante     | Acceso denegado, no menu                               |
| Asistente     | Resumen                                                |
| Administrador | all five                                               |

Descargas is unlocked by `view_download_history`, which only administrators hold by default.
`download_resources` (held by every role) does not open it. Changing the matrix on
`/administracion/permisos` changes the menu on the next request; no new login is needed. Hiding a
link is not authorization: every section page still calls `requirePermission`, as
[add-permissions.md](add-permissions.md) describes.

## Narrow screens

`AdminSidebar` renders one `<nav aria-label="Panel de administración">` holding a toggle button
and the list of links. CSS decides the layout at the existing 1120px breakpoint in `globals.css`:

- Above 1120px the sidebar is fixed on the left, 240px wide, and the button is not displayed.
- At 1120px and below the sidebar is a sticky bar under the header. The button shows a menu icon,
  the word Menú and the current section's name, with `aria-expanded` and `aria-controls` pointing
  at the list. Opening it expands the list in place and pushes the content down, so nothing
  overlaps and nothing is clipped.
- The list closes on Escape (focus returns to the button), on a pointer outside the navigation,
  when a link is chosen, or when the pathname changes. The open state is the pathname it was
  opened on, so a navigation closes it without an effect.

Both layouts are one DOM, so each link exists once and the same rule (`isAdminItemActive`) marks
the current section in the list and names it on the button.

`--header-height` in `globals.css` is the measured height of `.site-header`: 82px, 75px at 1400px
and below, 64px at 760px and below. The sidebar's `top` uses it, so the sidebar starts exactly
under the header at every width. Measure again if the header changes.

## The shared footer (LASCE-ADM-001)

The panel keeps the public `.site-footer`; it is not duplicated. Two rules in `globals.css` keep it
clear of the panel:

- `.admin-shell` is `flex: 1` inside `.public-shell-content` instead of having its own
  `min-height`. `.public-shell` already makes the page at least one viewport tall, so a short
  section (Descargas with no rows) shows the footer at the bottom of the screen, with no scroll and
  no empty band, and a long one shows it after the content.
- Above 1120px the fixed sidebar runs to the bottom of the viewport, so
  `body:has(.admin-shell) .site-footer` gets `margin-left: 240px` and starts where the sidebar
  ends. At 1120px and below the sidebar is the sticky bar and the footer keeps the full width.
  Change both numbers together if the sidebar width changes.

## Covered by

| Piece                                              | File                                             | Covered by                                                            |
| -------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------- |
| Catalogue and visibility rule                      | `app/lib/admin-sections.ts`                      | `admin-sections.test.ts`                                              |
| Grant lookup in the layout                         | `app/(public)/administracion/layout.tsx`         | `tests/e2e/administracion.spec.ts`                                    |
| Menu filtered by `granted`                         | `app/components/administracion/AdminShell.tsx`   | `AdminShell.test.tsx`                                                 |
| Toggle, Escape, outside pointer, close on navigate | `app/components/administracion/AdminSidebar.tsx` | `AdminSidebar.test.tsx`, `tests/e2e/administracion-mobile.spec.ts`    |
| Breakpoint, sticky offset, no overflow             | `app/globals.css`                                | `tests/e2e/administracion-mobile.spec.ts` (390px, 320px, 1440px, axe) |
| Footer clear of the sidebar, short and long pages  | `app/globals.css`, `AdminShell.tsx`              | `AdminShell.test.tsx`, `tests/e2e/administracion-footer.spec.ts`      |

## "Modo edición"

The "Modo edición" switch is not in the panel: it lives in the signed-in account menu of the top
bar (and in the mobile menu), so it can be changed from any page. See
[header-and-navigation.md](header-and-navigation.md#modo-edición-in-the-account-menu).
