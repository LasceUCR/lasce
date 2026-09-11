# Public scientific data query

`LASCE-PUB-002` provides a public, read-only query at `/datos`. Visitors select a source, a
scientific product grouped under its instrument, a channel or parameter, one calendar day, and an
increasing UTC time range. No login or download action is exposed.

## Sources and provenance

The response always includes an `origin` object. The interface displays its provider and whether
the values are `observed` or `simulated`; these states must never be inferred from styling alone.

### GOES

GOES queries are performed server-side against NOAA Space Weather Prediction Center's public
rolling JSON services under `https://services.swpc.noaa.gov`. These are real observations from the
currently designated primary GOES satellite; they are not generated or replaced with fallback
samples when NOAA is unavailable.

| Course code    | Visualization                          | NOAA operational source                               |
| -------------- | -------------------------------------- | ----------------------------------------------------- |
| `SFXR`         | Time series by X-ray band              | `xrays-7-day.json`                                    |
| `SFEU`         | Time series by EUV line                | `euvs-7-day.json`                                     |
| `GEOF`         | Time series by magnetic component      | `magnetometers-7-day.json`                            |
| `MPSH`         | Time series by electron/proton channel | Differential electron/proton 7-day JSON               |
| `SGPS`         | Time series by proton threshold        | `integral-protons-7-day.json`                         |
| SUVI bands     | Observed image sequence                | NOAA's primary SUVI animation indexes                 |
| `EHIS`, `MPSL` | Not enabled                            | Requires scientific NetCDF integration and validation |

The rolling time-series feeds cover seven days. The SUVI animation indexes cover approximately the
latest 24 hours. The date field communicates those limits, and a valid range with no observations
returns an empty result rather than invented values. Up to 360 real time-series observations are
selected at evenly distributed positions for browser rendering; this is sampling, not
interpolation, and the response notice says when it happened.

NOAA also publishes daily science-quality NetCDF-4 files through NCEI. Supporting dates outside the
rolling window, plus `EHIS` and `MPSL`, requires a separate ingestion/parser path for those files.
Do not map a merely similar operational feed to either course product without confirmation from
the scientific team.

References:

- [NOAA SWPC data access](https://www.spaceweather.gov/content/data-access)
- [NOAA GOES primary JSON directory](https://services.swpc.noaa.gov/json/goes/primary/)
- [NCEI GOES-R Level 1b archive](https://data.ngdc.noaa.gov/platforms/solar-space-observing-satellites/goes/goes16/l1b/)
- [NCEI EXIS X-ray Flux metadata](https://www.ncei.noaa.gov/access/metadata/landing-page/bin/iso?id=gov.noaa.ncei.swx:exis-l1b-sfxr-goesr)

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

NOAA transport or schema failures return `502`; invalid criteria return `400`. Responses use
`Cache-Control: no-store` so a stale observation is not presented as a new query result.

## Verification

Unit tests cover catalog validation, source isolation, NOAA payload parsing and filtering, all
enabled operational feeds, SUVI filename timestamps, sampling without interpolation, ROSAC series
and spectrum generation, request errors, accessible chart descriptions, source switching and the
absence of downloads. Playwright covers the public GOES flow with an API-boundary fixture, ROSAC's
dynamic spectrum, invalid ranges, empty results and mobile overflow. `/datos` remains part of the
repository-wide WCAG A/AA axe sweep.
