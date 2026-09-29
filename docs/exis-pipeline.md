# The EXIS pipeline job

`apps/worker/app/processors/exis_pipeline.py` is the orchestrator for the `exis-pipeline` job. It
ingests the readings of the GOES **EXIS** instrument, one product per job:

| Product | What it measures                 | Channel codes stored                                                  |
| ------- | -------------------------------- | --------------------------------------------------------------------- |
| `SFEU`  | EUV lines and the Mg II index    | `1175` `1216` `1335` `1405` `256` `284` `304` (nm × 10), `mgii_index` |
| `SFXR`  | X-rays, short and long XRS bands | `0.05-0.4nm` (XRS-A), `0.1-0.8nm` (XRS-B)                             |

The channel codes are the parameter codes the `/datos` explorer already uses
(`apps/web/app/lib/scientific-data.ts`), so a future chart can ask for exactly the series a user
picked there.

Like [`suvi-pipeline`](suvi-pipeline.md), the processor is thin. It decides which day to ingest,
calls the modules that do the work in order, and reports progress back to BullMQ.

## Why a day at a time, not "the latest frame"

NOAA's NGDC archive does **not** publish EXIS the way it publishes SUVI. SUVI appears frame by
frame, minutes after observation. EXIS appears as **one aggregated NetCDF per product per UTC
day**, in one directory per month:

```
goes19/l1b/exis-l1b-sfxr/2026/09/ops_exis-l1b-sfxr_g19_d20260927_v0-0-0.nc
```

- Each file lands about a day late (around 04:20 UTC the next morning), so the newest file is
  normally yesterday's.
- A file is 5 MB (SFXR, 86 400 reports at 1 s) to 9 MB (SFEU, 2 880 reports at 30 s).
- NOAA sometimes **republishes** a day: the same name with a newer `Last-Modified`, or a higher
  `_vX-Y-Z`.

So "fetch the newest frame in the last N minutes" cannot work here. The job instead asks for "the
newest day in the last N days that changed since I last ingested it". NOAA's real-time SWPC JSON
feeds were considered and rejected: they carry X-rays only (no EUV lines, no Mg II) and are not
L1b.

## Who owns what

| Concern                                         | Owner                                                      |
| ----------------------------------------------- | ---------------------------------------------------------- |
| Listing and fetching NGDC directories           | `app/clients/ngdc.py` (shared with SUVI)                   |
| EXIS file names, month windows, `Last-Modified` | `app/clients/exis.py` (`ExisDownloader`)                   |
| The netCDF lock, XRS primary-detector selection | `app/clients/netcdf.py` (shared with `query-goes-archive`) |
| Decoding every channel, storing it              | `app/services/exis_readings.py`                            |

## The request: `ExisPipelinePayload`

Defined once in `packages/contracts/src/jobs.ts` and mirrored in `apps/worker/app/models/jobs.py`:

| Field          | Type               | Default | Meaning                                                          |
| -------------- | ------------------ | ------- | ---------------------------------------------------------------- |
| `product`      | `SFEU` or `SFXR`   | —       | Which product to ingest                                          |
| `spacecraft`   | `16`–`19`          | `19`    | GOES satellite number                                            |
| `lookbackDays` | `int`, 1–31        | `3`     | How many days before today to consider                           |
| `date`         | ISO date, optional | —       | Ingest exactly this day instead (backfill); ignores the lookback |

`packages/jobs/src/schedules.ts` fires one job per product **every hour at minute 20**, with a
3-day lookback. When nothing changed, a run costs one listing plus one `HEAD` per day in the
window. Nothing is downloaded.

To backfill, trigger the job by hand with a date:

```bash
curl -X POST http://localhost:3000/api/jobs/exis-pipeline/trigger \
  -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" \
  -d '{"product":"SFEU","date":"2026-09-01"}'
```

## The stages of `run()`

```
list_recent()/list_day()  ──►  modified_at() vs catalogue  ──►  fetch()  ──►  decode()  ──►  persist()
   (month listings)              (HEAD, newest day first)       (bytes)     (all channels)  (Influx, then Postgres)
```

1. **List, don't download.** The client lists every month directory the window touches, because a
   window crossing the 1st spans two. It keeps the highest version of each day, newest day first.
   An empty window returns `file: null` with progress `100`. This is normal, not an error.

2. **Find the first changed day.** Newest first, the processor `HEAD`s each file and compares its
   `Last-Modified` with `source_modified_at` in `solar.exis_files`:
   - The first file that differs is ingested.
   - A file the server sends no `Last-Modified` for cannot be proven unchanged, so it counts as
     changed.
   - If every day matches, the run returns `skipped: true`.

   A republished older day is therefore picked up once the newer days are current. As with SUVI,
   **one file per run**; a backlog clears over the next hourly runs.

3. **Decode off the event loop.** `decode()` runs inside `asyncio.to_thread`, under the
   process-wide netCDF lock (HDF5 is not thread safe). It checks `platform_ID` and `title`, so a
   file of the wrong spacecraft or product is rejected instead of being stored as the wrong
   channels. For each channel it drops:
   - fill values
   - reports whose quality flags carry any bit of `good_quality_qf`
   - negative values
   - for XRS, reports whose `primary_xrs*` is not 0/1 or whose `invalid_flags` is set. Each XRS
     report is taken from the detector NOAA flags as primary, never averaged.

   These are the same rules `query-goes-archive` applies to the CITIC granules.

4. **Store: InfluxDB first, then Postgres.** `persist()` writes the points to InfluxDB in batches
   of 10 000:
   - measurement `exis_irradiance`
   - tags `satellite`, `product`, `channel`
   - field `value`
   - the observation time as the timestamp

   Only then does it upsert the `solar.exis_files` row. The order is deliberately the reverse of
   SUVI's. The row is what tells the next run "this day is done", so a failure part-way leaves no
   row and the day is redone. Redoing a day is safe: InfluxDB replaces a point with the same
   series and timestamp instead of duplicating it.

Progress is reported at `25 → 50 → 75 → 100`: after listing, after download, after decoding, after
storing.

## What a run returns

```jsonc
{
  "product": "SFXR",
  "spacecraft": 19,
  "file": {
    "name": "ops_exis-l1b-sfxr_g19_d20260927_v0-0-0.nc",
    "url": "https://data.ngdc.noaa.gov/.../exis-l1b-sfxr/2026/09/ops_exis-l1b-sfxr_g19_d20260927_v0-0-0.nc",
    "day": "2026-09-27",
    "version": "0-0-0",
    "modifiedAt": "2026-09-28T04:17:28+00:00",
    "bytes": 5091695,
  },
  "available": 2, // days in the window, not just the one ingested
  "skipped": false, // true when every day in the window was already ingested
  "fileId": "…", // the solar.exis_files row this run wrote or updated
  "points": { "0.05-0.4nm": 81206, "0.1-0.8nm": 81208 }, // per channel, after filtering
  "pipelineDate": "2026-09-29T…Z",
}
```

`file`, `fileId` and `points` are `null` together when the window was empty or `skipped` is
`true`.

On the real 2026-09-27 GOES-19 files, about 6 % of SFXR reports and 6 % of SFEU reports are
dropped by the quality flags. That is expected, not a decoder fault.

## Out of scope

- **Visualization.** Nothing in `apps/web` reads `exis_irradiance` yet. `/datos` still queries
  CITIC on demand through `query-goes-archive`
  ([`public-scientific-data.md`](public-scientific-data.md)).
- **Downsampling.** SFXR is stored at its native 1 s cadence (about 160 000 points per day). A
  chart should downsample in its InfluxDB query, not here.
- **Near real time.** The data is about a day old by design, because that is when NOAA publishes
  it.

Update this file when the **order of stages**, the **payload shape**, the **stored series** or
**what a run returns** changes.
