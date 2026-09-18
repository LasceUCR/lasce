# Public scientific data query

`LASCE-PUB-002` provides a public, read-only query at `/datos`. Visitors select a source, a
scientific product grouped under its instrument, a channel or parameter, one calendar day, and an
increasing UTC time range. No login or download action is exposed.

## Sources and provenance

The response always includes an `origin` object. The interface displays its provider and whether
the values are `observed` or `simulated`; these states must never be inferred from styling alone.

### GOES

GOES time series are read from the [CITIC-UCR public archive](https://nube.citic.ucr.ac.cr/index.php/s/QT3SfLRSDyaDkEo). SUVI images continue to use NOAA SWPC, as the shared archive has no SUVI directory. Neither adapter substitutes simulated observations on failure.

The verified WebDAV root is `https://nube.citic.ucr.ac.cr/public.php/dav/files/QT3SfLRSDyaDkEo/GOES/`. Paths are fixed server-side. Days use `YYYYMMDD/` directories of short NetCDF-4 L1b granules; older days may instead be `YYYYMMDD.tar.gz`. The archive uses `SEIS` in paths and filenames, while the instrument is named SEISS in the UI.

| Product    | Archive path                   | Selection                                                                          |
| ---------- | ------------------------------ | ---------------------------------------------------------------------------------- |
| SFXR       | EXIS/SFXR                      | XRS-A or XRS-B, using each report's primary detector flag                          |
| SFEU       | EXIS/SFEU                      | Average irradiance for seven EUV lines, or NOAA historical Mg II ratio             |
| GEOF       | MAG/GEOF                       | Ambient EPN x/y/z or total ACRF magnitude                                          |
| MPSH       | SEIS/MPSH                      | Electron bands 1–10 or proton bands 1–11, with explicit telescope 1–5              |
| SGPS       | SEIS/SGPS                      | Explicit SGPS−X or SGPS+X sensor; differential channels or integral P11 (>500 MeV) |
| SUVI bands | NOAA primary animation indexes | Images from approximately the last 24 hours                                        |
| EHIS, MPSL | Present under SEIS             | Reader and channel catalog remain pending                                          |

Operational SWPC channels are not interchangeable with L1b selectors. The former MPSH nominal energies are replaced with archive band/telescope identifiers. SGPS L1b does not supply the previous integral thresholds below 500 MeV. EPN components retain their native axis names; no undocumented coordinate transform or directional averaging is applied. Flux units are checked against NetCDF metadata.

The web enqueues `query-goes-archive`; only the Python worker downloads and decodes NetCDF. The endpoint responds with `202` and `{ state: 'pending', jobId, progress }` during processing. The browser polls the same criteria with `jobId` every two seconds. Completed work returns the existing time-series response with CITIC provenance. Identical requests share a deterministic job identifier; current-day requests refresh in ten-minute buckets. BullMQ retains completed results for up to 24 hours, subject to its count cap. A new submission can retry failed work; polling never retries or re-enqueues expired jobs.

Run `pnpm worker:install` after pulling this change: the worker requires `netCDF4`, `numpy`, and `httpx`. The historical flow now needs Redis and a running worker, in addition to the web server. No new environment variables or database migrations are needed. SUVI and provisional ROSAC remain synchronous.

Processing uses CF time units and calendars, preserves subsecond timestamps, and includes the entire selected end minute. Fill values, non-finite values, negative irradiance/particle flux, and degraded or invalid data-quality flags are excluded. MAG's valid correction flag is accepted according to its good-quality bit mask. No values are interpolated. At most 360 observations are sampled uniformly by position after filtering and sorting; the notice identifies sampling. Conflicting timestamps and mixed-satellite intervals fail explicitly.

The worker lists only the requested day, selects overlapping granules by filename, and downloads at most four files concurrently. NetCDF/HDF5 decoding runs off the asyncio loop with a process-wide lock because its C library is not thread safe. Compressed days are spooled to a temporary file and read without extracting paths. Limits are 6,000 granules, 8 MiB per granule, 1 GiB compressed and 4 GiB expanded per day, and 30 minutes per processing attempt. Browser cancellation stops polling; shared background work may finish for other visitors.

There is no rolling seven-day restriction on historical date selection. Availability varies by product and day. Confirmed missing directories and compressed files produce an empty result; timeouts, invalid formats, and transport errors fail the query.

SUVI alone uses a rolling 24-hour limit. The server provides the initial UTC bounds; the browser
refreshes them every minute. The calendar and time fields expose the allowed interval, switching
from a historical product fits the selection to that interval, and the API rejects out-of-window
image requests before contacting NOAA. This constraint does not restrict CITIC historical dates.

On 2026-09-13 the reader was checked against real G18 L1b samples dated 2025-01-05 for all five enabled historical products. Synthetic NetCDF fixtures exercise detector selection, fill values, quality flags, sensor dimensions, time bounds, and compressed archives without depending on the remote service.

### ROSAC

ROSAC is a forward-compatible source entry, not a claim about the final instrument configuration.
Until the team supplies the instrument catalog, schema, units, cadence, and endpoint, it exposes:

- `Instrumento 1 (por definir)`: simulated time series.
- `Instrumento 2 (por definir)`: simulated dynamic spectrum between provisional 100–1000 MHz bins.

Every ROSAC result is marked `simulated` in text and metadata. The mock adapter rejects GOES
queries, which prevents simulated values from being presented as satellite observations.

## Dynamic-spectrum scope (Has to be reviwed by the client)

The current spectrum is an accessible time-frequency heat map with a text description, explicit
axes and an expandable data table. It establishes the response shape needed for real ROSAC data.
The frequency range is provisional and follows the existing ROSAC project description in this
repository; it is not measured instrument resolution.

The [Spectrum GUI reference](https://secchirh.obspm.fr/spip.php?article44=) also supports profile
plots at a chosen time or frequency, background subtraction, color tables and zoom. Those controls
are intentionally not implemented yet: doing so responsibly depends on the real ROSAC dimensions,
calibration and background-removal rules.

## API boundary

Example:

```text
GET /api/scientific-data?source=GOES&product=SFXR&parameter=0.1-0.8nm&date=2026-09-10&startTime=08%3A00&endTime=09%3A00
```

The endpoint validates source/product/parameter compatibility and the calendar/time range with the
same Zod schema used by the browser. Results use a discriminated union:

- `time-series` with `points`;
- `image-sequence` with NOAA image URLs and capture timestamps;
- `dynamic-spectrum` with `timestamps`, `frequencies`, and `cells`.

Source or worker failures return `502`; invalid criteria return `400`. Responses use
`Cache-Control: no-store` so a stale observation is not presented as a new query result.

## Reusable presentation

The query's three selectors share `Select`, a labeled combobox with keyboard navigation,
type-ahead, disabled options, and Escape/outside dismissal. Its popup fits the viewport, uses a
bounded vertical scrollbar, and wraps long option labels within the menu. Pointer hover uses a
subtle background; keyboard focus remains visible. Reduced-motion preferences disable animation.

The data page uses `TopicHero` with `variant="compact"`. This opt-in variant is available to other
interactive pages; default headers retain their original dimensions. There are no page-specific
or explorer CSS files. Styles follow the repository's existing `globals.css` pattern with scoped
component class names and tokens documented in `color-palette.md`.

- `Notice` exposes information, warning and error tones with an explicit accessible role.
- `DataTable` provides a collapsible, keyboard-scrollable table with a visible caption.
- `ScientificDataChart` accepts values, labels and units through props; the time axis uses actual
  timestamps rather than evenly spacing irregular observations.
- `DynamicSpectrumChart` receives its title, caption and frequency unit from the caller, without
  assuming a source or whether the observations are simulated.

Charts have a bounded desktop width and a focusable horizontal viewport on small screens so axis
labels are not shrunk into illegible text. The document itself stays within the viewport.

## Verification

Unit tests cover catalog validation, source isolation, historical job contracts, NetCDF decoding and filtering, archive transport, SUVI filename timestamps, sampling without interpolation, ROSAC series
and spectrum generation, request errors, accessible chart descriptions, source switching and the
absence of downloads. Playwright covers the public GOES flow with an API-boundary fixture, ROSAC's
dynamic spectrum, invalid ranges, empty results and mobile overflow. `/datos` remains part of the
repository-wide WCAG A/AA axe sweep.
