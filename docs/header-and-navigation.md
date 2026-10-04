# Header and navigation

Institutional branding and the responsive top bar/menu for the public site (issue #164). Covers
`PublicHeader.tsx`, `Brand.tsx` and `NavGroup.tsx`.

## Institutional identity (`Brand.tsx`)

The public header renders the full institutional lockup, in order: the COMPDES seal, the UCR
wordmark, a divider, the CINESPA logo, a divider, and the LASCE logo (`apps/web/app/components/
public/Brand.tsx`). `Brand` also has a `light` variant (UCR seal only) used where a single mark is
enough; the footer currently renders that variant, and giving the footer the full lockup is tracked
in a separate PBI owned by another teammate, not this one.

All four marks are Next.js `Image` components pointing at `apps/web/public/brand/`; the source
files are heavier than ideal (the CINESPA and LASCE assets are several hundred KB each), mitigated
at request time by Next.js's built-in image optimization (no `unoptimized` override in
`next.config.ts`). Swapping in re-compressed originals later needs no code change, only new files
at the same paths.

### Small screens (`max-width: 430px`)

Below 430px the header used to hide the COMPDES/UCR seal entirely and kept the other marks at a
size that read as an afterthought. The tier in `globals.css` now:

- Shows the seal (`.brand .compdes-logo`) again, fading it out only once the header is in its
  scrolled/compact state (`.site-header.is-scrolled .brand .compdes-logo`), mirroring the existing
  760px-tier behavior instead of introducing a new pattern.
- Sizes the CINESPA mark larger than before (94×31 vs. the old 83×27) since it's the institute name
  most visitors need to recognize.
- Re-budgets the whole brand row (gaps, divider height, each logo's box) so nothing overflows the
  375px viewport, the narrowest phone width this repo verifies against.

## Menu organization (`PublicHeader.tsx`, `NavGroup.tsx`)

The `navigation` array in `PublicHeader.tsx` is the single source for both the desktop bar and the
mobile menu. Each entry has an `id` and, for a link, an `href`; the label is the message with that
id in the `nav` namespace of `apps/web/messages/`, so the table below shows the Spanish labels
(see [`internationalization.md`](internationalization.md)). The mobile accordion tracks which
groups are open by `id`, not by label, so the state survives a change of language. The header also
renders the language switcher (`LanguageSwitcher.tsx`): in `.header-actions` on desktop and in
`.mobile-language-section` in the mobile menu. It reaches every area of the homepage's "Áreas y accesos principales" section
(`app/lib/work-areas.ts`) without a trip back to `/`:

| Top bar entry | Kind     | Items                                                                                               |
| ------------- | -------- | --------------------------------------------------------------------------------------------------- |
| Inicio        | link     | `/`                                                                                                 |
| Nosotros      | dropdown | Quiénes somos, Colaboraciones e Iniciativas                                                         |
| Investigación | dropdown | Áreas de investigación (`/investigacion`), Física solar, Clima espacial, ROSAC (`/radioastronomia`) |
| Datos         | link     | `/datos`                                                                                            |
| Divulgación   | dropdown | Noticias, Galería                                                                                   |
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
- Covered by `PublicHeader.test.tsx` (touch outside) and `tests/e2e/responsive-controls.spec.ts`
  (outside tap after scrolling the panel, last option in landscape).

## Covered by

| Piece                            | File                                     | Covered by                                           |
| -------------------------------- | ---------------------------------------- | ---------------------------------------------------- |
| Institutional lockup             | `app/components/public/Brand.tsx`        | (no dedicated unit test yet)                         |
| Desktop group disclosure         | `app/components/public/NavGroup.tsx`     | `NavGroup.test.tsx`                                  |
| Header layout + mobile accordion | `app/components/public/PublicHeader.tsx` | `PublicHeader.test.tsx`                              |
| Responsive rules for both        | `app/globals.css`                        | `tests/e2e/responsive-controls.spec.ts`, plus manual |
