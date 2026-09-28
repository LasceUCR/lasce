# ROSAC location map

The public `/radioastronomia` page embeds one ROSAC location map and keeps the address in server-rendered text outside the map. Directions, geolocation and administration are outside this feature's scope.

## Ownership and configuration

`app/lib/rosac.ts`, under `rosacInfoContent.location`, owns the coordinates, initial zoom, provider URL, attribution, initial loading deadline and public copy. The coordinates are the existing team-provided Google Maps pin (10.2840093, -85.5959871). Changes in this fix do not independently validate the physical location; record stakeholder validation in the PBI before closing it.

`RosacInfoPage` passes that content to `RosacLocationMapLoader`. The loader is a Client Component using `next/dynamic` with `ssr: false`, because Leaflet accesses `window`. Its outer `ErrorBoundary` also contains rejected dynamic imports. `RosacLocationMap` has a boundary for its rendered map subtree. Both use `LocationUnavailable`, while the address and other page sections remain outside both boundaries.

## Provider and reliability

The map uses Leaflet and React Leaflet with Esri World Imagery. Tile coordinates use `{z}/{y}/{x}`. Keep the provider attribution when changing presentation.

Tile events are handled on `TileLayer`, not `Map`. A `tileload` records a successful image. When `load` reports all visible requests have settled, the fallback appears if no image succeeded. An individual failed request does not discard a partially working map, even if it fails before another request succeeds. A 15-second initial deadline also handles requests that never settle; it is cancelled on unmount. Later failures do not remove a map that has already displayed imagery.

Marker PNG imports are normalized to URL strings for both Next's static image objects and URL-based bundlers. They are bundled locally, without a separate marker CDN.

## Accessibility and layout

- The map region and keyboard-focusable map have Spanish accessible names.
- The permanent ROSAC tooltip identifies the pin visually; the marker's own accessible name is also ROSAC.
- Zoom controls are named Acercar and Alejar. The map references keyboard instructions explaining arrow keys, zoom and Tab navigation.
- The attribution link remains underlined, so color is not its only distinguishing feature.
- Wheel zoom is disabled so scrolling over the map continues scrolling the page.
- The map reserves its height during loading and fits the content width. The address remains readable if the map fails.

## Verification

Unit tests exercise events on the real `TileLayer`, including total failure, mixed success/failure and a stalled request deadline. The loader test simulates a failed dynamic component and verifies the fallback and surrounding content.

`tests/e2e/rosac.spec.ts` verifies public access, actual satellite imagery, provider request failure, marker containment and page width at 320, 390, 768 and 1440 pixels, Spanish control names, keyboard exit and axe checks. The real-provider smoke test requires network access to Esri. Browser coverage in the repository is Chromium; Firefox, WebKit and manual screen-reader verification remain separate release checks.
