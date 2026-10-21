# The MAG pipeline job

`apps/worker/app/processors/mag_pipeline.py` is the orchestrator for the `mag-pipeline` job. It
ingests the geomagnetic field the GOES **MAG** magnetometer measures (`/datos` product `GEOF`), one
UTC day per job, into InfluxDB, and records the day in Postgres:

| Channel code | What it is                                                 | Unit |
| ------------ | ---------------------------------------------------------- | ---- |
| `EPN-x`      | Field component along x of the Earth-Poleward-Normal frame | nT   |
| `EPN-y`      | Field component along y (poleward)                         | nT   |
| `EPN-z`      | Field component along z                                    | nT   |
| `total`      | Field magnitude                                            | nT   |

The channel codes are the parameter codes the `/datos` explorer already uses
(`apps/web/app/lib/scientific-data.ts`), so the chart asks for exactly the series a user picked.

It is a sibling of [`exis-pipeline`](exis-pipeline.md): same archive, same daily layout, same
handling of republished days. Read that document for the reasoning this one only summarises.

## Why NOAA's L2 1-minute product

`/datos` used to read MAG on demand from CITIC's L1b granules (`query-goes-archive`). Those are one
file per minute; at about 3.4 s per download, four at a time, the form's default 00:00–23:59 query
fetched about 1 440 files and took about 20 minutes, close to the job's 30-minute timeout.

NOAA's NGDC archive (the one SUVI and EXIS already use) publishes MAG three ways for GOES-19:

| Directory               | Cadence | Size per day | Notes                                      |
| ----------------------- | ------- | ------------ | ------------------------------------------ |
| `l1b/mag-l1b-flat`      | 10 Hz   | ~156 MB      | about 3.5 M points a day for four channels |
| `l2/data/magn-l2-hires` | 10 Hz   | ~185 MB      | same cadence, L2                           |
| `l2/data/magn-l2-avg1m` | 1 min   | ~1.2 MB      | **ingested**                               |

A chart never shows more than 360 points, so 1 440 one-minute averages a day already exceed what
it can draw, at about 1 % of the download. A full-resolution product can be added later as its
own job if a use for it appears.

```
goes19/l2/data/magn-l2-avg1m/2026/10/dn_magn-l2-avg1m_g19_d20261014_v2-0-4.nc
```

- One file per UTC day, in one directory per month; it lands around 04:00 UTC the next morning.
- NOAA can republish a day under the same name (newer `Last-Modified`) or a higher `_vX-Y-Z`.

## Who owns what

| Concern                                              | Owner                                                            |
| ---------------------------------------------------- | ---------------------------------------------------------------- |
| Listing and fetching NGDC directories, month walk    | `app/clients/ngdc.py` (shared with SUVI and EXIS)                |
| MAG file names, `Last-Modified`                      | `app/clients/mag.py` (`MagDownloader`)                           |
| The netCDF lock, quality mask, time and JSON helpers | `app/clients/netcdf.py` (shared with EXIS)                       |
| Decoding every channel, storing it                   | `app/services/mag_readings.py`                                   |
| Reading it back for `/datos`                         | `apps/web/app/services/scientific-data/magReadingsDataSource.ts` |

## The request: `MagPipelinePayload`

Defined once in `packages/contracts/src/jobs.ts` and mirrored in `apps/worker/app/models/jobs.py`:

| Field          | Type               | Default | Meaning                                                          |
| -------------- | ------------------ | ------- | ---------------------------------------------------------------- |
| `spacecraft`   | `16`–`19`          | `19`    | GOES satellite number                                            |
| `lookbackDays` | `int`, 1–31        | `3`     | How many days before today to consider                           |
| `date`         | ISO date, optional | —       | Ingest exactly this day instead (backfill); ignores the lookback |

There is no `product` field: the job has one product. `packages/jobs/src/schedules.ts` fires it
**every hour at minute 25**, five minutes after EXIS, with a 3-day lookback. When nothing changed,
a run costs one listing plus one `HEAD` per day in the window.

To backfill:

```bash
curl -X POST http://localhost:3000/api/jobs/mag-pipeline/trigger \
  -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" \
  -d '{"date":"2026-10-14"}'
```

## The stages of `run()`

```
list_recent()/list_day()  ──►  modified_at() vs catalogue  ──►  fetch()  ──►  decode()  ──►  persist()
   (month listings)              (HEAD, newest day first)       (bytes)     (4 channels)   (Influx, then Postgres)
```

1. **List, don't download.** Every month directory the window touches is listed; the highest
   version of each day is kept, newest day first. An empty window returns `file: null`.
2. **Find the first changed day**, exactly as EXIS does: a name never ingested, or one whose
   `Last-Modified` differs from the recorded `source_modified_at`. If none, `skipped: true`.
   **One file per run**; a backlog clears over the next hourly runs.
3. **Decode off the event loop**, under the netCDF lock. The file must say
   `platform = "g19"` (the L2 files have no `platform_ID`) and carry a title naming the
   1-minute magnetometer product. For every channel it drops:
   - fill values (`-9999`) and non-finite values or times
   - reports whose `DQF` carries any bit of `good_quality_qf` (its first `flag_masks` entry).
     `valid_arcjet_correction_qf` is outside that mask, so a corrected report is kept.
   - reports whose `b_quality` is not `0` (`1` degraded, `2` bad, or missing)

   Negative values are **kept**: a field component is signed. This is the one rule that differs
   from EXIS.

4. **Store: InfluxDB first, then Postgres.** Points go to measurement `mag_field`, tags
   `satellite` (`G19`), `product` (`GEOF`), `channel`, fields `value` and `valid`. A re-ingested
   day first rewrites readings the new file dropped as `valid=false` (InfluxDB 3 Core cannot
   delete points). Then the `solar.mag_files` row is upserted; it is what marks the day done, so
   a failure part-way leaves the day to be redone.

Progress is reported at `25 → 50 → 75 → 100`.

## What a run returns

```jsonc
{
  "product": "GEOF",
  "spacecraft": 19,
  "file": {
    "name": "dn_magn-l2-avg1m_g19_d20261014_v2-0-4.nc",
    "url": "https://data.ngdc.noaa.gov/.../magn-l2-avg1m/2026/10/dn_magn-l2-avg1m_g19_d20261014_v2-0-4.nc",
    "day": "2026-10-14",
    "version": "2-0-4",
    "modifiedAt": "2026-10-15T04:02:00+00:00",
    "bytes": 1209954,
  },
  "available": 3,
  "skipped": false,
  "fileId": "…", // the solar.mag_files row
  "points": { "EPN-x": 1440, "EPN-y": 1440, "EPN-z": 1440, "total": 1440 },
  "pipelineDate": "2026-10-15T…Z",
}
```

`file`, `fileId` and `points` are `null` together when the window was empty or `skipped` is
`true`. On the real 2026-10-14 GOES-19 file every one of the 1 440 reports passed both quality
flags.

## How `/datos` reads it

`magReadingsDataSource.ts` queries `mag_field` through InfluxDB's SQL API, synchronously, with
the same helper as EXIS (`goesReadingsDataSource.ts`): only `valid = true`, only the satellite
that observed last, at most 360 points sampled inside the query for the chart, every reading for
the CSV export. A day never ingested is an empty series. See
[`public-scientific-data.md`](public-scientific-data.md) and [`downloads.md`](downloads.md).

## Out of scope

- **Near real time.** The data is about a day old by design, because that is when NOAA publishes
  it.
- **Other coordinate frames.** The file also has GSE, GSM, ECI, BRF and VDH vectors; only EPN and
  the magnitude are stored, because only they are offered on `/datos`. Adding a frame means a
  channel in `CHANNELS` and a parameter in the catalogue.
- **GOES-18.** The schedule ingests GOES-19 only; trigger the job with `"spacecraft": 18` to load
  another satellite.

Update this file when the **order of stages**, the **payload shape**, the **stored series** or
**what a run returns** changes.
