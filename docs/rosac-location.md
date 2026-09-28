# ROSAC location map

How the "Ubicación" section of `/radioastronomia` shows the ROSAC facility on a map, and the
decisions behind it (issue: ROSAC Location Map PBI). Covers `RosacLocationMap.tsx`,
`RosacLocationMapLoader.tsx`, `ErrorBoundary.tsx` and the `location` content in
`app/lib/rosac.ts`.

## The shape

```
RosacInfoPage.tsx (Server Component)
  └─ TopicSection "2. Ubicación"        intro = content.location.intro, includes the address
       └─ RosacLocationMapLoader (Client)      next/dynamic(..., { ssr: false })
            └─ RosacLocationMap (Client)       the actual Leaflet map
                 └─ ErrorBoundary
                      └─ MapContainer / TileLayer / Marker / Tooltip (react-leaflet)
```

| Piece                         | File                                      | Covered by                                                                                       |
| ----------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Location content & copy       | `app/lib/rosac.ts` (`location` field)     | `RosacInfoPage.test.tsx`                                                                         |
| Section wiring                | `RosacInfoPage.tsx`                       | `RosacInfoPage.test.tsx`                                                                         |
| Client-only loading           | `RosacLocationMapLoader.tsx`              | exercised via `RosacInfoPage.test.tsx` (no dedicated test: it is a one-line `next/dynamic` call) |
| The map itself                | `RosacLocationMap.tsx`                    | `RosacLocationMap.test.tsx`                                                                      |
| Generic render-error fallback | `app/components/public/ErrorBoundary.tsx` | (no dedicated unit test yet)                                                                     |
| Browser checks                | `apps/web/tests/e2e/rosac.spec.ts`        | Playwright                                                                                       |

## Why a separate Client Component for loading

`RosacLocationMap.tsx` needs `leaflet` and `react-leaflet`, and `leaflet` reads `window` as soon as
it is imported. `RosacInfoPage.tsx` is a Server Component, and Next.js does not allow
`next/dynamic(..., { ssr: false })` inside one -- it has to live in a Client Component.
`RosacLocationMapLoader.tsx` exists only to hold that `dynamic()` call and a loading skeleton, so
`RosacInfoPage.tsx` can stay a Server Component like the rest of this page.

## Coordinates and address

`app/lib/rosac.ts`'s `location.coordinates` is Google Maps' pin for "Radiobservatorio de Santa
Cruz ROSAC UCR", confirmed by the team as the correct location -- not a surveyed GPS point, but
accurate enough for wayfinding. If it ever needs correcting, update it in `app/lib/rosac.ts` alone
-- nothing else needs to change.

The address itself is not rendered as its own line: a standalone "Recinto de Santa Cruz,
Universidad de Costa Rica..." paragraph directly below an intro sentence that already named the
same place read as duplicated text, and being short and comma-separated, it also came out
oddly spaced under the site's justified body-text style, which suits a full sentence, not a
bare address. `rosac.ts` now builds `location.intro` from a single `rosacLocationAddress`
constant, so the address appears once, as part of one flowing sentence, and `location.address`
(the same constant) stays available as plain data for anything that needs the bare string rather
than a sentence -- nothing currently does.

## The map provider

Leaflet + Esri World Imagery satellite tiles (`server.arcgisonline.com/.../World_Imagery/...`), not
Google Maps or Mapbox: no API key or credentials to provision, and the project had none configured
for any map provider before this PBI. Esri's tile URL uses `{z}/{y}/{x}` ordering, the reverse of
OpenStreetMap's `{z}/{x}/{y}` -- worth remembering if the provider ever changes again. The
attribution line `TileLayer` renders ("Tiles © Esri...") is required by Esri's tile usage policy --
do not remove it.

## Reliability: what "the map cannot be loaded" means here

- The address is part of `content.location.intro`'s own text (see "Coordinates and address"
  below), rendered by `TopicSection` directly, outside the map component entirely -- so it is on
  the page whether the map loads, fails, or is still downloading its client bundle.
- `RosacLocationMap.tsx`'s `TileWatcher` only flips to the "unavailable" message on a `tileerror`
  that happens **before any tile has ever loaded successfully**. A single flaky tile among dozens,
  on a map the visitor can already see, does not tear down a working map.
- `ErrorBoundary` catches a synchronous render error from anything inside it (Leaflet or
  react-leaflet throwing outright) and shows the same "unavailable" message, so a total failure in
  the map still leaves the rest of the ROSAC page intact.

## Accessibility

- The map sits in its own labelled region (`role="region"`, `aria-label` naming the facility), so
  it has an accessible name independent of Leaflet's own internal markup.
- The marker's label is a `permanent` Leaflet `Tooltip` ("ROSAC"), visible without a click or hover,
  so the marker reads as ROSAC in the initial view, not only on interaction.
- `scrollWheelZoom` is off: a visitor scrolling the page past the map keeps scrolling the page
  instead of the gesture being captured as a zoom. Dragging, the on-screen +/- controls, touch
  pinch and keyboard zoom (once the map has focus) still work.

## Verification

`RosacLocationMap.test.tsx` fires `tileload`/`tileerror` directly on the real Leaflet map instance
(exposed to the test only through the `onMapReady` prop) rather than waiting on real tile network
requests, which would be slow and flaky in a test run. `apps/web/tests/e2e/rosac.spec.ts` covers
the map in a real browser: it loads without authentication, fits the viewport at 1440 and 390px,
and falls back to the unavailable message with the address still visible when tile requests are
blocked.
