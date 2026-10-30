# The EHIS pipeline job

`apps/worker/app/processors/ehis_pipeline.py` is the orchestrator for the `ehis-pipeline` job. It
ingests the energetic heavy ion flux the GOES **SEISS EHIS** sensor measures (`/datos` product
`EHIS`), one UTC day per job, into InfluxDB, and records the day in Postgres. 25 series are kept:
five energy bands (`E1`–`E5`) for each of five mass groups.

| Channel code          | Mass group             | Unit                          |
| --------------------- | ---------------------- | ----------------------------- |
| `H:E1` … `H:E5`       | Hydrogen               | `cm-2 sr-1 s-1 (MeV nuc-1)-1` |
| `He:E1` … `He:E5`     | Helium                 | `cm-2 sr-1 s-1 (MeV nuc-1)-1` |
| `CNO:E1` … `CNO:E5`   | Carbon-nitrogen-oxygen | `cm-2 sr-1 s-1 (MeV nuc-1)-1` |
| `NeS:E1` … `NeS:E5`   | Neon-sulfur            | `cm-2 sr-1 s-1 (MeV nuc-1)-1` |
| `ClNi:E1` … `ClNi:E5` | Chlorine-nickel        | `cm-2 sr-1 s-1 (MeV nuc-1)-1` |

The channel codes are the parameter codes the `/datos` explorer uses
(`apps/web/app/lib/scientific-data.ts`), where the unit reads `partículas/(cm²·s·sr·MeV/nucleón)`.

It is a sibling of [`mag-pipeline`](mag-pipeline.md) and [`exis-pipeline`](exis-pipeline.md):
same archive, same daily layout, same handling of republished days. Read those documents for the
reasoning this one only summarises.

## Why NOAA's L1b daily aggregation

Before this job, `/datos` listed EHIS as pending. The other SEISS products (MPSH, SGPS) are read on
demand from CITIC's L1b granules through `query-goes-archive`. EHIS goes through a daily
pipeline instead, like MAG, so a query is answered from InfluxDB without waiting on a job.

NOAA's NGDC archive publishes **no L2 product for EHIS** (the `l2/data` directory of GOES-16 to
19 has MPSH and SGPS averages, nothing for EHIS). It does publish a daily aggregation of the L1b
granules, which is what is ingested:

```
goes19/l1b/seis-l1b-ehis/2026/10/ops_seis-l1b-ehis_g19_d20261014_v0-0-2.nc
```

- One file per UTC day, in one directory per month; it lands around 04:30 UTC the next morning.
- About 300 KB a day: 288 reports, one per 5-minute accumulation.
- NOAA can republish a day under the same name (newer `Last-Modified`) or a higher `_vX-Y-Z`.

## Who owns what

| Concern                                           | Owner                                                             |
| ------------------------------------------------- | ----------------------------------------------------------------- |
| Listing and fetching NGDC directories, month walk | `app/clients/ngdc.py` (shared with SUVI, EXIS and MAG)            |
| EHIS file names, `Last-Modified`                  | `app/clients/ehis.py` (`EhisDownloader`)                          |
| The netCDF lock, quality masks, time helpers      | `app/clients/netcdf.py` (shared with EXIS and MAG)                |
| Decoding every channel, storing it                | `app/services/ehis_readings.py`                                   |
| Reading it back for `/datos`                      | `apps/web/app/services/scientific-data/ehisReadingsDataSource.ts` |

## The request: `EhisPipelinePayload`

Defined once in `packages/contracts/src/jobs.ts` and mirrored in `apps/worker/app/models/jobs.py`,
with the same shape as MAG's:

| Field          | Type               | Default | Meaning                                                          |
| -------------- | ------------------ | ------- | ---------------------------------------------------------------- |
| `spacecraft`   | `16`–`19`          | `19`    | GOES satellite number                                            |
| `lookbackDays` | `int`, 1–31        | `3`     | How many days before today to consider                           |
| `date`         | ISO date, optional | —       | Ingest exactly this day instead (backfill); ignores the lookback |

`packages/jobs/src/schedules.ts` fires it **every hour at minute 35**, ten minutes after MAG, with
a 3-day lookback.

To backfill:

```bash
curl -X POST http://localhost:3000/api/jobs/ehis-pipeline/trigger \
  -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" \
  -d '{"date":"2026-10-14"}'
```

## The stages of `run()`

```
list_recent()/list_day()  ──►  modified_at() vs catalogue  ──►  fetch()  ──►  decode()  ──►  persist()
   (month listings)              (HEAD, newest day first)       (bytes)    (25 channels)  (Influx, then Postgres)
```

1. **List, don't download.** Every month directory the window touches is listed; the highest
   version of each day is kept, newest day first. An empty window returns `file: null`.
2. **Find the first changed day**, exactly as EXIS and MAG do. If none, `skipped: true`. **One
   file per run.**
3. **Decode off the event loop**, under the netCDF lock. The file must say
   `platform_ID = "G19"` and carry a title naming the Energetic Heavy Ion Sensor (EHIS), and every
   flux must be in `cm-2 sr-1 s-1 (MeV nuc-1)-1`. The file has no `time` variable: a report's time
   is the start of its elemental flux accumulation, `ELF_StartStopTime[:, 0]`, which the product
   calls the time of observation. For every channel it drops:
   - fill values (`-1e31`), negative fluxes, and non-finite values or times
   - readings whose per-band DQF carries any **invalid** bit, or no flag at all

   **Degraded readings are kept**, which is the rule that differs from MAG and from the other
   SEISS products. See below.

4. **Store: InfluxDB first, then Postgres.** Points go to measurement `ehis_flux`, tags
   `satellite` (`G19`), `product` (`EHIS`), `channel`, fields `value` and `valid`. A re-ingested
   day first rewrites readings the new file dropped as `valid=false`. Then the
   `solar.ehis_files` row is upserted; it is what marks the day done.

Progress is reported at `25 → 50 → 75 → 100`.

### Why degraded readings are kept

Each mass group's `<group>5MinuteDifferentialFluxDQFs` flags a reading as good, invalid
(`invalid_due_to_missing_L0_data_or_not_operational_mode_qf`,
`invalid_due_to_calibration_failed_qf`, and for helium also `invalid_due_to_sgps_inputs_qf`) or
degraded (dead time, out-of-band contamination, or a dynamic error that is too large or cannot be
calculated). The invalid bits are read from each variable's `flag_meanings`
(`netcdf.invalid_quality`), because helium has one the others lack.

On a quiet day almost every reading is degraded, because the statistical error cannot be calculated
from so few counts. On the real 2026-10-14 GOES-19 file, dropping degraded readings the way MAG
does would keep only `H:E3` and leave the other 24 channels empty. Keeping them keeps a full day
(288 readings) for every H and He band. The heavier groups stay nearly empty anyway: they have no
flux at all (fill) for almost every report, so CNO, Ne-S and Cl-Ni had between 0 and 7 readings
per band that day. The `/datos` notice says degraded readings are included.

## What a run returns

```jsonc
{
  "product": "EHIS",
  "spacecraft": 19,
  "file": {
    "name": "ops_seis-l1b-ehis_g19_d20261014_v0-0-2.nc",
    "url": "https://data.ngdc.noaa.gov/.../seis-l1b-ehis/2026/10/ops_seis-l1b-ehis_g19_d20261014_v0-0-2.nc",
    "day": "2026-10-14",
    "version": "0-0-2",
    "modifiedAt": "2026-10-15T04:31:27+00:00",
    "bytes": 304547,
  },
  "available": 3,
  "skipped": false,
  "fileId": "…", // the solar.ehis_files row
  "points": { "H:E1": 288, "He:E1": 288, "CNO:E1": 5, "NeS:E1": 0 /* …25 channels */ },
  "pipelineDate": "2026-10-16T…Z",
}
```

`file`, `fileId` and `points` are `null` together when the window was empty or `skipped` is
`true`.

## How `/datos` reads it

EHIS belongs to the SEISS instrument, whose other products still go to CITIC. So
`apps/web/app/services/scientific-data/index.ts` routes EHIS with a **product-level override**
(the third argument of `createInstrumentRoutedDataSource`), while MPSH and SGPS keep the SEISS
instrument provider. `ehisReadingsDataSource.ts` queries `ehis_flux` with the same helper as EXIS
and MAG (`goesReadingsDataSource.ts`): only `valid = true`, only the satellite that observed last.
A day has at most 288 readings, so the chart is never sampled. A day never ingested is an empty
series.

## Out of scope

- **Data (CSV) downloads.** Download policies are set per instrument, and SEISS offers PNG only
  until MPSH and SGPS have a full-resolution path too. See [`downloads.md`](downloads.md).
- **Be–Cu elements.** The file also carries 26 individual elements (`BeCu5MinuteDifferentialFluxes`),
  almost entirely fill on a quiet day; adding them means a channel in `CHANNELS` and parameters
  in the catalogue.
- **MPSL**, SEISS's other pending product.
- **GOES-18.** The schedule ingests GOES-19 only; trigger the job with `"spacecraft": 18` to load
  another satellite.

Update this file when the **order of stages**, the **payload shape**, the **stored series**, the
**quality rule** or **what a run returns** changes.
