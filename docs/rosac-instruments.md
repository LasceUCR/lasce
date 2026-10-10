# ROSAC instrument cards (LASCE-PUB-001)

`/radioastronomia#instrumentos` presents three public cards as section 6, after
"¿Por qué observar en radio?" and its existing "ROSAC y LASCE" banner.
Researchers and acknowledgments are numbered 7 and 8.
No account or separate detail page is required. `app/lib/rosac-instruments.ts` owns their
editorial content; `InstrumentCard` only renders props.

The first two entries reuse the identifiers and simulated product information of the existing
ROSAC instruments in `app/lib/scientific-data.ts`. Their card titles are "ROSAC-SABER" and
"ROSAC-MIRA 9GHz", with their frequency bands in characteristics. Their links open the matching simulation on
`/datos?source=ROSAC&instrument=ROSAC-I1#scientific-query-title` (or `ROSAC-I2`). These are
demonstrations, not confirmed hardware or observed data. Instrument 3 is "ROSAC-HIROS" and remains a pending card
with a disabled "Consultar simulación del instrumento 3" button and no consultation link, and is
**not** added to the data catalog, contracts or backend.
All three cards temporarily use illustrative photos from the ROSAC construction gallery,
identified as such in the section introduction and alternative text. They do not identify
the mock instruments. The original gallery assets are reused through Next.js image optimization.

## Replacing pending content

Only publish instrument content supplied or approved by LASCE. Update the appropriate entry
in `rosac-instruments.ts`, retaining its stable `id` and any existing consultation link.

- `name`: approved instrument name (ROSAC-SABER, ROSAC-MIRA 9GHz, ROSAC-HIROS).
- `pendingMessage`: keep while information is pending; omit when the card is complete.
- `image`: optional `{ src, alt }`. Use an optimized web image under `apps/web/public/images/ROSAC/`
  and an informative Spanish description of that same instrument. External URLs require a
  matching Next.js image configuration. Replace the temporary illustrative gallery photos with
  the corresponding instrument photos once supplied.
- `purpose`: optional approved purpose.
- `characteristics`: optional list of approved characteristics.
- `citation`: optional citation exactly as supplied by LASCE. Omit when none is provided;
  it is rendered as plain text, with line breaks preserved.
- `consultation`: optional `{ href?, label, notice? }`. With `href` the button links to that
  destination; only configure an available one, and retain the simulation notice until real data
  is integrated. Without `href` the button is rendered disabled (pending instrument 3), so every
  card shows the same action in the same position. Add the `href` and `notice` once it exists.

Missing fields are omitted. Missing or failed images use a neutral placeholder while the
card's text stays visible. Images load lazily through `next/image`, with responsive sizes,
reserved space and preserved proportions. Updating an image URL clears its previous error state.
Storybook contains simulation, pending, pending integration, partial, complete example and failed-image states;
the example scientific content is not used on the public page.

## Navigation and accessibility

`getInitialScientificQuery` validates ROSAC navigation against the existing catalog and chooses
the product's first valid parameter. `/datos` keeps its original GOES default for unknown,
incompatible or repeated parameters. `source=ROSAC` without an instrument selects the first
simulation. Preselection does not submit a query. The explorer remounts when a navigation changes
the selected source/product, so a previous form state cannot override the incoming link.
Card links load the destination document so the browser handles the query anchor directly.
The static query heading retains its focus target for assistive technology without a visible
outline. Interactive controls still show their keyboard focus indicators.

Cards are named articles with level-three headings under the section's level-two heading.
Links have distinct Spanish names and use the existing visible keyboard focus styles.
The third card shows its consultation as a native disabled button: it cannot be focused or
activated, assistive technology announces it as unavailable, and the visible pending message
explains why. It uses a neutral fill and border with muted text instead of the action color, and
keeps the same position and width as the enabled buttons. Layout uses a responsive three-column grid aligned with
the other sections, compact padding and 16:9 image frames. Consultation links use solid blue
action buttons.

The researcher flip transition respects the reduced-motion preference.

## Verification

Unit tests cover partial content, optional citations, failed-image recovery, the three cards,
catalog consistency, and safe URL preselection. Playwright covers
public access, keyboard navigation to both simulations, the unchanged two-instrument selector,
invalid links, 320/390/768/1440px layouts, reduced-motion researcher flips, and WCAG A/AA axe
scans scoped to the instrument cards.
