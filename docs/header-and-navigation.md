# Header and navigation

Institutional branding and the responsive top bar/menu for the public site (issue #164). Covers
`PublicHeader.tsx`, `Brand.tsx` and `NavGroup.tsx`.

## Institutional identity (`Brand.tsx`)

The public header renders the full institutional lockup, in order: the UCR shield
(`compdes-ucr.png`), the UCR signature (the "Universidad de Costa Rica" lettering), a divider, the
CINESPA logo, a divider, and the LASCE logo (`apps/web/app/components/public/Brand.tsx`).

Alt text: the shield is "Universidad de Costa Rica"; the signature only repeats that name as
lettering, so its alt is empty and the university is announced once, at every width. CINESPA is
"Centro de Investigaciones Espaciales" and LASCE is "Laboratorio de Astrofísica Solar y Clima
Espacial". `Brand` also has a `light` variant (UCR seal only) used where a single mark is
enough; the footer currently renders that variant, and giving the footer the full lockup is tracked
in a separate PBI owned by another teammate, not this one.

All four marks are Next.js `Image` components pointing at `apps/web/public/brand/`; the source
files are heavier than ideal (the CINESPA and LASCE assets are several hundred KB each), mitigated
at request time by Next.js's built-in image optimization (no `unoptimized` override in
`next.config.ts`). Swapping in re-compressed originals later needs no code change, only new files
at the same paths.

### Small screens (`max-width: 430px`): the reduced lockup

At 320–430px the full lockup shrank the UCR signature's lettering to about 56×23px, which is not
legible (#503). The tier in `globals.css` switches to a reduced lockup: **the UCR shield and the
LASCE logo**, with the divider between them.

- The signature, CINESPA and the divider between them are `display: none`, so they are also out of
  the accessibility tree (nothing hidden is announced).
- The shield is 40px high and LASCE 30px high; both use `width: auto`, so each keeps its own
  proportions.
- The shield stays when the header is in its scrolled state: in this lockup it is the university's
  mark. (Between 431px and 760px it still fades out on scroll, as before.)
- Nothing overflows at 320px. Wider screens keep the full lockup.
- Covered by `tests/e2e/public-portal.spec.ts` (reduced lockup at 320/375/390px, full lockup at
  768/1440px) and `PublicHeader.test.tsx` (each name announced once).

## Menu organization (`PublicHeader.tsx`, `NavGroup.tsx`)

The `navigation` array in `PublicHeader.tsx` is the single source for both the desktop bar and the
mobile menu. Each entry has an `id` and, for a link, an `href`; the label is the message with that
id in the `nav` namespace of `apps/web/messages/`, so the table below shows the Spanish labels
(see [`internationalization.md`](internationalization.md)). The mobile accordion tracks which
groups are open by `id`, not by label, so the state survives a change of language. The header also
offers the language choice: `LanguageMenu.tsx` in `.header-actions` on desktop, a dropdown built
on `useDisclosure` like the nav groups, and the native `LanguageSwitcher.tsx` in
`.mobile-language-section` in the mobile menu. It reaches every area of the homepage's "Áreas y accesos principales" section
(`app/lib/work-areas.ts`) without a trip back to `/`:

| Top bar entry | Kind     | Items                                                                                               |
| ------------- | -------- | --------------------------------------------------------------------------------------------------- |
| Inicio        | link     | `/`                                                                                                 |
| Nosotros      | dropdown | Quiénes somos, Colaboraciones e Iniciativas                                                         |
| Investigación | dropdown | Áreas de investigación (`/investigacion`), Física solar, Clima espacial, ROSAC (`/radioastronomia`) |
| Datos         | link     | `/datos`                                                                                            |
| Divulgación   | dropdown | Noticias, Galería, Actividades académicas (`/actividades-academicas`)                               |
| Recursos      | dropdown | Publicaciones, Herramientas científicas                                                             |
| Contacto      | link     | `/contacto`                                                                                         |

Each destination appears once; a group is only a label, never a page of its own. `Áreas de
investigación` keeps `/investigacion` (the research areas page) reachable now that
`Investigación` is a dropdown rather than a link. `Administración` is not in this list: it lives
inside the signed-in account menu (`AccountLinks.tsx`/`AccountMenu.tsx`, see `docs/`'s auth docs),
so it never appears twice.

The desktop bar is only shown above 1400px (below that, the mobile menu takes over; see
`globals.css`). Adding entries widens it, so check the 1401–1440px range visually after changing
this list: the bar must not run into the brand lockup.

```
Desktop nav   › NavGroup (one per group)   <details>/<summary>, opens on hover, click, Enter/Space
                 └─ nav-group-panel          centered under the summary, one link per grouped page
Mobile nav    › .mobile-nav-group           same <details> pattern, no NavGroup component reuse
                 └─ mobile-nav-group-panel   indented links, auto-opens if the current page is inside
```

Both disclosures share the same idea — group state lives entirely in the native `open` attribute,
nothing is duplicated into React state — but are two separate implementations because the visual
requirements differ enough (hover support and a centered floating panel on desktop; an inline,
always-in-flow accordion with no hover/marking on mobile).

`isActivePath` (exported from `NavGroup.tsx`) is the one place that decides whether a given link is
"active"; both the desktop group and the mobile accordion use it, including to auto-open the group
when the current page is one of its children.

### Desktop: `NavGroup.tsx`

- Opens on `mouseenter`/`mouseleave` (no click required) as well as on click, Enter or Space; closes
  on Escape, a pointer outside the group, or focus leaving the group. See the component's own doc
  comment for the full list.
- That open/close interaction lives in `useDisclosure.ts`, not in `NavGroup.tsx` itself: it's shared
  with the signed-in account menu (`AccountMenu.tsx`) so both dropdowns open, close and feel
  identical. `NavGroup.tsx` only owns what goes in its panel.
- The panel (`.nav-group-panel`) is centered under the summary (`left: 50%; transform:
translateX(-50%)`), not right-anchored as it originally was.
- Covered by `NavGroup.test.tsx`, including a test for the hover-opens/mouse-leave-closes behavior.
  The centering itself is pure CSS and is not asserted in jsdom; verify it visually if you touch
  `.nav-group-panel`.

### Mobile: `.mobile-nav-group` (in `PublicHeader.tsx`)

- Same native `<details>`/`<summary>` idea, styled and structured separately from `NavGroup.tsx`.
- Deliberately has **no** background, hover or focus styling on the summary — only the chevron
  rotates when open. Two things to know if you touch this again:
  - Chrome's `<details>` puts everything after `<summary>` in an internal anonymous box that a
    `display: grid` on the `<details>` element itself does not reach. The links live in an explicit
    `<div className="mobile-nav-group-panel">` that sets its own `display: grid`.
  - `.mobile-menu summary` is a more specific selector than a single class and will silently win;
    the summary's own rules are qualified as `.mobile-menu nav .mobile-nav-group-summary` to beat
    it, and `outline: none` is set explicitly because clicking a `<summary>` (unlike a link or
    button) can trigger `:focus-visible` even from a mouse click.
- Covered by `PublicHeader.test.tsx`'s accordion test.

### Mobile: the menu panel (`.mobile-menu`)

- The page behind the menu is locked (`body { overflow: hidden }`) while it is open, so the panel
  scrolls itself: `max-height` is the dynamic viewport height (`100dvh`, with a `100vh` fallback)
  minus the header and the bottom safe area, with `overflow-y: auto`. This keeps the last option
  reachable in landscape on a phone.
- The menu closes on a `pointerdown` or `touchstart` anywhere outside the `<details>`, listened to
  in the capture phase. The listener reads `details.open` directly instead of React state, because
  the native `toggle` event is asynchronous and iOS can deliver the outside touch before it.
- Escape closes the open menu from anywhere inside it and returns focus to the toggle.
- The toggle is a 44×44px `<summary>` that shows a menu icon labelled `nav.openMenu` ("Abrir
  navegación" / "Open navigation") while closed, and an X labelled `nav.closeMenu` ("Cerrar
  navegación" / "Close navigation") while open.
- The transparent backdrop behind the panel is a pointer-only affordance: `aria-hidden`,
  `tabIndex={-1}` and no label, so keyboard and screen reader users close the menu with the toggle
  or Escape, and "Cerrar navegación" names a single control.
- Covered by `PublicHeader.test.tsx` (touch outside, Escape, toggle icon and name in both
  languages), `tests/e2e/responsive-controls.spec.ts` (outside tap after scrolling the panel, last
  option in landscape) and `tests/e2e/public-portal.spec.ts` (Escape in a real browser).

## Touch targets on phones

Small controls keep their look but get a hit area of at least 44×44px (#503):

- The home hero's "EN VIVO" badge (`.hero-live-trigger`) and its close button (`.hero-live-close`)
  extend their hit area with an invisible `::after`, so the pill and the "×" keep their size. The
  panel leaves 40px on the right so the close button's area never covers the text.
- At 760px and below, the footer links (`.footer-links a`) and the institution links
  (`.footer-institutions a`) are `inline-flex` boxes of at least 44×44px; the text keeps its size.
- Covered by `tests/e2e/public-portal.spec.ts`, which checks the badge and close button with
  `elementFromPoint` and the footer links' boxes at 375px.

## "Modo edición" in the account menu

Accounts whose role holds a content grant (`create_components`, `edit_components` or
`delete_components`) see a "Modo edición" switch (`EditModeSwitch.tsx`) in the desktop account
dropdown, between "Mi cuenta" and "Cerrar sesión", and in the mobile menu's account section.
Visitors and anonymous visitors do not. The decision is `canEdit` from `GET /api/session`, computed
on the server from the HttpOnly session and the current matrix, never from the browser-editable
account cookie (LASCE-SEC-001, see [sessions.md](sessions.md#the-header)). It is still a
visibility rule only: every edit is authorized by its Route Handler or Server Action.

- It reads and writes the shared `EditModeProvider` (`useEditMode`), so the current page updates at
  once; the value is kept in `localStorage`, so it survives navigation and reload.
- It is a `role="switch"` button with `aria-checked`, reachable with Tab inside the open dropdown.
  Clicking or pressing Enter on it does not close the menu (`useDisclosure` only closes on a link,
  Escape, an outside pointer or focus leaving the group).
- It is no longer in `AdminShell`, so there is one place to change it.
- Its label and every other dropdown item come from the `account` namespace of the catalogues
  (`account.editMode`: "Modo edición" / "Edit mode").
- In e2e, `enableEditMode(page)` in `tests/e2e/helpers/edit-mode.ts` opens the menu and flips it.

## Navigation feedback (#475)

Visitors reported that header and home page links "did nothing" on the first click. Nothing was
intercepting the click. Almost every public page is `force-dynamic`, and for a dynamic route
**without** a `loading.tsx`, Next 16 does not prefetch the page and keeps the current one on screen
until the server render finishes (see "Dynamic routes without `loading.tsx`" in
`node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`). A slow
render therefore looked like a dead link. The fix is a load bar, so the click is answered at once:

- **`NavigationProgress`** lives in the header's cyan strip (`.site-header::before`, sized by
  `--header-stripe-height`). On a click, the strip turns dark blue and the cyan fills back over it
  from the left. A finished bar looks exactly like the resting strip, so it ends without a flash.
  It is mounted once in `app/layout.tsx`. A capture-phase `click` listener on `document` starts
  it, so every link counts, not only the header's. It finishes when `usePathname()` or
  `useSearchParams()` change, and it gives up after 15 s if the URL never changes. It ignores what
  the browser handles itself:
  - modified or non-left clicks
  - `target="_blank"` and `download`
  - other origins
  - `#hash` links
  - links to the current URL

  A second click restarts the wait. The strip is `aria-hidden`. Next to it, a visually hidden
  `role="status"` message ("Cargando la página…" / "Loading the page…", `shell.pageLoading`)
  announces the load to screen readers while the bar runs, and empties when the page lands. Under
  `prefers-reduced-motion` the strip stays dark blue while the page loads, with no movement.

- **`app/(public)/error.tsx`** (`PageErrorState`) catches a page that throws, so a failed
  navigation ends on an error with a retry instead of a frozen page.

There is deliberately **no group-level `app/(public)/loading.tsx`**. One was tried and removed:

- A single generic skeleton did not match the shape of most pages.
- Inside a loading boundary the response streams, so its `200` status is sent before the page
  renders. Any page that calls `notFound()`, the `[...rest]` catch-all included, then answers
  `200` instead of `404`.

The old page therefore stays on screen until the new one is rendered, with the bar running. A page
that needs a skeleton gets its own `loading.tsx`, shaped like it, as `/contacto`, `/galeria` and
`/publicaciones` have. Before adding one, make sure the route never calls `notFound()`, or accept
that a missing item will answer `200`.

## Covered by

| Piece                            | File                                                               | Covered by                                           |
| -------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------- |
| Institutional lockup             | `app/components/public/Brand.tsx`                                  | `PublicHeader.test.tsx`, `public-portal.spec.ts`     |
| Desktop group disclosure         | `app/components/public/NavGroup.tsx`                               | `NavGroup.test.tsx`                                  |
| Header layout + mobile accordion | `app/components/public/PublicHeader.tsx`                           | `PublicHeader.test.tsx`                              |
| Account menu and its edit switch | `app/components/public/auth/AccountMenu.tsx`, `EditModeSwitch.tsx` | `AccountMenu.test.tsx`, `AccountLinks.test.tsx`      |
| Responsive rules for both        | `app/globals.css`                                                  | `tests/e2e/responsive-controls.spec.ts`, plus manual |
| Page-load bar                    | `app/components/public/NavigationProgress.tsx`                     | `NavigationProgress.test.tsx`                        |
| Public error boundary            | `app/(public)/error.tsx`                                           | `PageErrorState.test.tsx`                            |
