# Color palette

The LASCE brand palette is defined as CSS custom properties in the `:root` block of
[`apps/web/app/globals.css`](../apps/web/app/globals.css). Both the Next.js root layout and
Storybook preview import this stylesheet, so components share the same colors in both environments.

## Brand colors

The values use eight-digit hexadecimal notation (`#RRGGBBAA`). The final `ff` means fully opaque.

| Color             | CSS custom property   | Hex         | Usage                                                                       |
| ----------------- | --------------------- | ----------- | --------------------------------------------------------------------------- |
| Deep space blue   | `--deep-space-blue`   | `#0d2737ff` | Main text, footer, sidebar, and dark hover backgrounds                      |
| Deep space blue 2 | `--deep-space-blue-2` | `#023047ff` | Dark cards, links, and icons on light surfaces                              |
| Bright teal blue  | `--bright-teal-blue`  | `#087fbdff` | Focus outlines, interactive borders, and indicator accents                  |
| Blue green        | `--blue-green`        | `#219ebcff` | Header stripe, active navigation underline, and decorative accents          |
| Amber glow        | `--amber-glow`        | `#f99d08ff` | Primary button backgrounds, card interaction borders, and indicator accents |
| Amber flame       | `--amber-flame`       | `#ffb703ff` | Primary button backgrounds on hover and keyboard focus                      |
| Alice blue        | `--alice-blue`        | `#eef4f7ff` | Page background                                                             |
| White             | `--white`             | `#ffffffff` | Light surfaces and text on dark backgrounds                                 |

## Existing aliases

Existing component styles keep their shared variable names. These aliases resolve to the brand
palette instead of repeating hexadecimal values:

| Alias         | Brand property        | Role                                    |
| ------------- | --------------------- | --------------------------------------- |
| `--navy-deep` | `--deep-space-blue`   | Dark surfaces and text on amber buttons |
| `--ink`       | `--deep-space-blue`   | Main text on light surfaces             |
| `--blue`      | `--bright-teal-blue`  | Interactive borders and focus outlines  |
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

- Primary action buttons use the orange amber glow background with deep space blue text. Hover and
  keyboard focus use amber flame with the same text color.
- The home page and scientific tool actions share the `Button` component and `.button-primary` colors. Keep action button
  colors in that shared rule so component-specific styles do not override them.
- Use dark text on orange action buttons; white text has low contrast on these backgrounds.
- Keep bright teal blue, blue green, and amber as accents on light surfaces. Use `--ink` or
  `--blue-dark` for small text on those surfaces.

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
