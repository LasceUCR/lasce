# Color palette

The LASCE brand palette is defined as CSS custom properties in the `:root` block of
[`apps/web/app/globals.css`](../apps/web/app/globals.css). Both the Next.js root layout and
Storybook preview import this stylesheet, so components share the same colors in both environments.

## Brand colors

The values use eight-digit hexadecimal notation (`#RRGGBBAA`). The final `ff` means fully opaque.

| Color             | CSS custom property   | Hex         | Usage                                                              |
| ----------------- | --------------------- | ----------- | ------------------------------------------------------------------ |
| Deep space blue   | `--deep-space-blue`   | `#0d2737ff` | Main text, footer, sidebar, and dark hover backgrounds             |
| Deep space blue 2 | `--deep-space-blue-2` | `#023047ff` | Dark cards, links, and icons on light surfaces                     |
| Bright teal blue  | `--bright-teal-blue`  | `#087fbdff` | Scientific curves and supporting brand accents                     |
| Blue green        | `--blue-green`        | `#219ebcff` | Header stripe, active navigation underline, and decorative accents |
| Amber glow        | `--amber-glow`        | `#f99d08ff` | Actions on dark surfaces and semantic warning accents              |
| Amber flame       | `--amber-flame`       | `#ffb703ff` | Hover and keyboard-focus accents for actions on dark surfaces      |
| Alice blue        | `--alice-blue`        | `#eef4f7ff` | Page background                                                    |
| White             | `--white`             | `#ffffffff` | Light surfaces and text on dark backgrounds                        |

## Existing aliases

Existing component styles keep their shared variable names. These aliases resolve to the brand
palette instead of repeating hexadecimal values:

| Alias         | Brand property        | Role                                    |
| ------------- | --------------------- | --------------------------------------- |
| `--navy-deep` | `--deep-space-blue`   | Dark surfaces and text on amber buttons |
| `--ink`       | `--deep-space-blue`   | Main text on light surfaces             |
| `--blue`      | `--bright-teal-blue`  | Supporting brand accents                |
| `--blue-dark` | `--deep-space-blue-2` | Links and icons on light surfaces       |
| `--cyan`      | `--blue-green`        | Decorative accent                       |
| `--page`      | `--alice-blue`        | Page background                         |

Use an existing alias when its role fits. Use a named brand property when selecting a specific
brand color. Change the palette definitions in `:root` when updating a brand color; do not duplicate
its hex value in component styles or inline styles.

```css
.example-panel {
  background: var(--page);
  color: var(--ink);
  border-left: 4px solid var(--blue-green);
}
```

## Buttons and text contrast

- Actions on light surfaces use dark blue, with white text on filled primary buttons.
- Actions on dark surfaces use orange, with deep space blue text on filled primary buttons.
- Secondary and outline buttons inherit the same action accent for their text and border. Focus
  rings, interactive card borders and navigation feedback follow the surrounding surface too.
- Warning/status accents and scientific imagery retain their separate semantic colors; they do not
  indicate an action.

The shared styles expose three inherited tokens:

| Token            | Light surface (default) | Dark surface        |
| ---------------- | ----------------------- | ------------------- |
| `--action`       | `--deep-space-blue-2`   | `--amber-glow`      |
| `--action-hover` | `--deep-space-blue`     | `--amber-flame`     |
| `--on-action`    | `--white`               | `--deep-space-blue` |

Existing dark surfaces (the home hero, dark route placeholders, footer, area cards, media tiles,
lightbox and admin sidebar) set these tokens centrally in `globals.css`. Reusable containers can
declare `action-surface-dark` or `action-surface-light`; use the light class on a light panel nested
inside a dark section. Surface classes choose action colors only, so the container still owns its
background. Do not guess the theme from route names or override individual buttons.

```tsx
<section className="action-surface-dark">
  <Button href="/nosotros">Conoce más sobre LASCE</Button>
  <div className="action-surface-light">
    <Button href="/datos">Consultar datos</Button>
  </div>
</section>
```

The home page and scientific tools share `Button` and `.button-primary`. Storybook includes
primary and secondary examples on both light and dark backgrounds.

For reference, deep space blue text has a contrast ratio of approximately 7.23:1 on amber glow and
8.83:1 on amber flame. Check the actual foreground and background when adding a new combination,
including hover, focus, and any transparency.

## Supporting colors

The eight brand colors are not a replacement for every color in the site. The stylesheet also keeps:

- `--muted`, `--border`, and `--card-border-hover` for secondary text and subtle borders.
- `--teal` and the existing green and orange status styles for status indicators and themed cards.
- `--space-black`, `--space-kicker`, `--space-body`, `--space-meta`, and `--space-border` for dark
  imagery and the gallery lightbox.
- Existing surface tints, shadows, and image overlays that support those styles.

Keep these roles separate from brand accents. Status indicators should retain visible labels, and
scientific imagery should retain its own colors.

### Shared data components

`Notice` uses the existing blue accent for information and amber for provisional data. Its error
tone uses `--feedback-error` (`#9c302b`), a semantic dark red; notice text remains `--ink` on a 7%
tint of the accent. This token is the only extra color introduced for scientific queries.

`ScientificDataChart` uses the blue and neutral tokens for curves, axes, and labels.
`DynamicSpectrumChart` interpolates from `--alice-blue` to `--blue-dark` for both cells and its
legend. It also provides numeric descriptions and an accompanying `DataTable`, so users do not
need to distinguish colors to access the values. Observed SUVI images retain NOAA's colors.
