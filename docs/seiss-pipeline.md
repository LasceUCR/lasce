# The SEISS pipeline job

`apps/worker/app/processors/seiss_pipeline.py` is the orchestrator for the `seiss-pipeline` job. It
ingests one GOES **SEISS** product, one UTC day per job, into InfluxDB, and records the day in
Postgres. The payload's `product` says which:

| Product | `/datos` product                     | NOAA file                                      | Cadence   | Series | Measurement |
| ------- | ------------------------------------ | ---------------------------------------------- | --------- | -----: | ----------- |
| `EHIS`  | Energetic heavy ions                 | L1b daily aggregation `seis-l1b-ehis`          | 5 minutes |     25 | `ehis_flux` |
| `SGPS`  | Solar and galactic protons           | L2 one-minute averages `sgps-l2-avg1m`         | 1 minute  |     28 | `sgps_flux` |
| `MPSH`  | Magnetospheric electrons and protons | L2 one-minute averages `mpsh-l2-avg1m_science` | 1 minute  |    105 | `mpsh_flux` |

MPSL is not ingested; see [Out of scope](#out-of-scope).

It is a sibling of [`mag-pipeline`](mag-pipeline.md) and [`exis-pipeline`](exis-pipeline.md):
same archive, same daily layout, same handling of republished days. Read those documents for the
reasoning this one only summarises. Like `exis-pipeline`, one job serves several products and the
schedule has one entry per product, so a failed run of one product never holds up another.

## Why one job for every SEISS product

The SEISS products differ only in where NOAA files them, how a file is named, and how a file is
decoded. Listing, the republished-day check, storing, withdrawing dropped readings and the
catalogue row are the same for all of them, so they are written once:

| Concern                                           | Owner                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------ |
| Listing and fetching NGDC directories, month walk | `app/clients/ngdc.py` (shared with SUVI, EXIS and MAG)                   |
| Each product's directory and file names           | `app/clients/seiss.py` (`SeissProduct`, `SeissDownloader`)               |
| The netCDF lock, quality masks, time helpers      | `app/clients/netcdf.py` (shared with EXIS and MAG)                       |
| Decoding one product's file                       | `app/services/seiss/ehis.py`, `app/services/seiss/sgps.py`               |
| Which decoder and measurement a product uses      | `DECODERS` in `app/services/seiss/__init__.py`                           |
| Storing any product's readings and catalogue row  | `app/services/seiss/readings.py` (`SeissReadings`)                       |
| Reading it back for `/datos`                      | `apps/web/app/services/scientific-data/{ehis,sgps}ReadingsDataSource.ts` |

Adding a product means a `SeissProduct` member (directory and file pattern), a decoder module and
its `DECODERS` entry, the product in the payload enum on both sides, a schedule entry, and a web
reader routed in `scientific-data/index.ts`.

## The files

```
goes19/l1b/seis-l1b-ehis/2026/10/ops_seis-l1b-ehis_g19_d20261014_v0-0-2.nc
goes19/l2/data/sgps-l2-avg1m/2026/10/sci_sgps-l2-avg1m_g19_d20261027_v3-0-3.nc
```

- One file per product per UTC day, in one directory per month; it lands around 04:30 UTC the
  next morning.
- EHIS is about 300 KB a day; SGPS 0.4 MB (2.5 MB for the late-2024 versions); MPSH 1 MB.
- NOAA can republish a day under the same name (newer `Last-Modified`) or a higher `_vX-Y-Z`, and
  does rewrite older days after newer ones appear.
- NOAA publishes **no L2 product for EHIS**, so its L1b daily aggregation is read. SGPS is read
  from NOAA's L2 one-minute averages, which replace CITIC's per-granule L1b files that
  `query-goes-archive` used to download on demand.

## The request: `SeissPipelinePayload`

Defined once in `packages/contracts/src/jobs.ts` and mirrored in `apps/worker/app/models/jobs.py`:

| Field          | Type                       | Default | Meaning                                                          |
| -------------- | -------------------------- | ------- | ---------------------------------------------------------------- |
| `product`      | `EHIS` \| `SGPS` \| `MPSH` | —       | Which SEISS product to ingest                                    |
| `spacecraft`   | `16`–`19`                  | `19`    | GOES satellite number                                            |
| `lookbackDays` | `int`, 1–31                | `3`     | How many days before today to consider                           |
| `date`         | ISO date, optional         | —       | Ingest exactly this day instead (backfill); ignores the lookback |

`packages/jobs/src/schedules.ts` fires EHIS **every hour at minute 35**, SGPS **at minute 40** and MPSH **at minute 45**,
after MAG, each with a 3-day lookback.

To backfill:

```bash
curl -X POST http://localhost:3000/api/jobs/seiss-pipeline/trigger \
  -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" \
  -d '{"product":"SGPS","date":"2026-10-27"}'
```

## The stages of `run()`

```
list_recent()/list_day()  ──►  modified_at() vs catalogue  ──►  fetch()  ──►  decode()  ──►  persist()
   (month listings)              (HEAD, newest day first)       (bytes)   (the product's)  (Influx, then Postgres)
```

1. **List, don't download.** Every month directory the window touches is listed; the highest
   version of each day is kept, newest day first. An empty window returns `file: null`.
2. **Find the first changed day**, exactly as EXIS and MAG do. If none, `skipped: true`. **One
   file per run.**
3. **Decode off the event loop**, under the netCDF lock, with the product's decoder. Each checks
   the spacecraft, the title and the units, and drops fill values (`-1e31`), negative fluxes and
   non-finite values or times. What else it drops is the product's quality rule, below.
4. **Store: InfluxDB first, then Postgres.** Points go to the product's measurement, tags
   `satellite` (`G19`), `product` (`EHIS`, `SGPS`, `MPSH`), `channel`, fields `value` and `valid`. A
   re-ingested day first rewrites readings the new file dropped as `valid=false`. Then the
   `solar.seiss_files` row is upserted; it is what marks the day done.

Progress is reported at `25 → 50 → 75 → 100`.

## EHIS

Five energy bands (`E1`–`E5`) for each of five mass groups, coded `<group>:E<band>`, all in
`cm-2 sr-1 s-1 (MeV nuc-1)-1` (`partículas/(cm²·s·sr·MeV/nucleón)` on `/datos`):

| Channel code          | Mass group             |
| --------------------- | ---------------------- |
| `H:E1` … `H:E5`       | Hydrogen               |
| `He:E1` … `He:E5`     | Helium                 |
| `CNO:E1` … `CNO:E5`   | Carbon-nitrogen-oxygen |
| `NeS:E1` … `NeS:E5`   | Neon-sulfur            |
| `ClNi:E1` … `ClNi:E5` | Chlorine-nickel        |

The file must say `platform_ID = "G19"` and carry a title naming the Energetic Heavy Ion Sensor
(EHIS). It has no `time` variable: a report's time is the start of its elemental flux
accumulation, `ELF_StartStopTime[:, 0]`, which the product calls the time of observation. A
reading whose per-band DQF carries any **invalid** bit, or no flag at all, is dropped.

### Why degraded EHIS readings are kept

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

## SGPS

Two sensor units, `minus` (−X, index 0) and `plus` (+X, index 1), each with 13 differential
channels and the > 500 MeV integral one, coded `<unit>:<channel>`:

| Channel code                                                                 | Variable            | Unit                                    |
| ---------------------------------------------------------------------------- | ------------------- | --------------------------------------- |
| `P1`, `P2A`, `P2B`, `P3`–`P7`, `P8AF`, `P8BF`, `P8CF`, `P9F`, `P10` per unit | `AvgDiffProtonFlux` | `protons/(cm^2 sr keV s)`               |
| `P11` per unit                                                               | `AvgIntProtonFlux`  | `protons/(cm^2 sr s)` (pfu on `/datos`) |

The explorer kept the L1b names for the four highest-energy channels (`P8AF` … `P9F`; the L2 file
calls them `P8A` … `P9`); the L2 file orders its 13 channels the same way, so the codes did not
change. Sensor units stay in the instrument frame and are not swapped on a yaw flip, as the
explorer has always named them. The alpha channels are not stored.

The file must say `platform = "g19"` (L2 files have no `platform_ID`) and carry a title naming
`SEISS/SGPS` one-minute averages. `time` is in seconds since 2000-01-01 12:00 UTC, the start of
each minute.

### The SGPS quality rule

L2 averages do not carry good/degraded/invalid bitmasks. Per average they count the valid 1-second
L1b samples that went into it (`DiffValidL1bSamplesInAvg`, `IntValidL1bSamplesInAvg`) and, of
those, how many were flagged for dead time, out-of-band contamination, dynamic error or a missing
opposite sensor (`*DQF{dtc,oob,err,los}Sum`).

An average built from **no valid sample** is dropped (`netcdf.averaged`). The flagged-sample counts
do not drop an average: as with degraded EHIS readings, a flagged-but-valid average is still the
best measurement there is, and the high-flux storm minutes are the ones most often flagged. On the
real 2026-10-27 GOES-19 file this keeps 1 438 of 1 440 minutes in every channel.

## MPSH

Five electron and five proton telescopes (`T1`–`T5`, each its own viewing direction), coded
`<species>:T<telescope>:E<band>`:

| Channel code                         | Variable              | Unit                        |
| ------------------------------------ | --------------------- | --------------------------- |
| `electron:T1:E1` … `electron:T5:E10` | `AvgDiffElectronFlux` | `electrons/(cm^2 sr keV s)` |
| `proton:T1:E1` … `proton:T5:E11`     | `AvgDiffProtonFlux`   | `protons/(cm^2 sr keV s)`   |

The archive has two MPSH directories. `mpsh-l2-avg1m` stopped being updated in January 2026, so
`mpsh-l2-avg1m_science` (same variables) is read. The file must say `platform = "g19"` and carry a
title naming `SEISS/MPS-HI` one-minute averages. The quality rule is the SGPS one, with the
`DiffElectronValidL1bSamplesInAvg` and `DiffProtonValidL1bSamplesInAvg` counts. The integral
electron channel (> 2 MeV) is not stored.

NOAA itself writes fill into the highest electron band when it has too few counts: on the real
2026-10-27 GOES-19 file `electron:T5:E10` kept 861 minutes, every other channel close to 1 440.

## What a run returns

```jsonc
{
  "product": "SGPS",
  "spacecraft": 19,
  "file": {
    "name": "sci_sgps-l2-avg1m_g19_d20261027_v3-0-3.nc",
    "url": "https://data.ngdc.noaa.gov/.../sgps-l2-avg1m/2026/10/sci_sgps-l2-avg1m_g19_d20261027_v3-0-3.nc",
    "day": "2026-10-27",
    "version": "3-0-3",
    "modifiedAt": "2026-10-28T04:34:12+00:00",
    "bytes": 412646,
  },
  "available": 3,
  "skipped": false,
  "fileId": "…", // the solar.seiss_files row
  "points": { "minus:P1": 1438, "plus:P11": 1438 /* …28 channels */ },
  "pipelineDate": "2026-10-28T…Z",
}
```

`file`, `fileId` and `points` are `null` together when the window was empty or `skipped` is
`true`.

## How `/datos` reads it

`apps/web/app/services/scientific-data/index.ts` routes EHIS, SGPS and MPSH with
**product-level overrides** (the third argument of `createInstrumentRoutedDataSource`). The SEISS
instrument provider (CITIC through `query-goes-archive`) is still registered but no longer reached:
MPSL, the only other SEISS product, is not offered. Retiring it is a follow-up. Each reader queries its measurement with the same helper as EXIS and MAG
(`goesReadingsDataSource.ts`): only `valid = true`, only the satellite that observed last. An EHIS
day has at most 288 readings and is never sampled; an SGPS or MPSH day of 1 440 minutes is sampled
inside the query to at most 360 points (about 290 for a full day), and the notice says so. A day never ingested is an empty series.

## Out of scope

- **MPSL.** NOAA publishes **no L2 one-minute product** for MPS-LO (`mpsl-l2-avg1m` does not
  exist); only an L1b daily aggregation of about 220 MB a day. Ingesting it needs its own channel
  catalogue and a decision on averaging, so it stays pending on `/datos`.
- **EHIS Be–Cu elements, SGPS alphas and the MPSH integral electron channel.** Adding them means channels in the decoder and
  parameters in the catalogue.
- **GOES-18.** The schedule ingests GOES-19 only; trigger the job with `"spacecraft": 18` to load
  another satellite.

Update this file when a **product is added**, or when the **order of stages**, the **payload
shape**, the **stored series**, a **quality rule** or **what a run returns** changes.
