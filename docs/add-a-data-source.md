# Adding a scientific data source

This guide explains how to add or integrate a new scientific data source end-to-end: from
ingesting raw observational or simulated data in the Python worker, storing it in the appropriate
storage engine (InfluxDB 3, MinIO, PostgreSQL), to exposing it through the web service layer for
charting and downloads on `/datos`.

Follow this guide whenever connecting a new satellite instrument, ground-based observatory
(such as ROSAC), or simulation dataset.

---

## Architecture overview

```
[ Upstream Archive ]  (NOAA AWS S3 / CITIC / Observatory stream)
        │
        ▼ (Scheduled BullMQ job)
[ apps/worker ]       (asyncio + processors: decode, validate DQF, downsample)
        │
        ├──▶ InfluxDB 3   (Time-series: measurements, tags, value, valid=true)
        ├──▶ MinIO        (Imagery: WebP frames in assets/)
        └──▶ PostgreSQL   (Catalogue & ingestion ledger: solar.* tables)
        │
[ apps/web ]          (Next.js server services)
        ├── ScientificDataProvider & ScientificDataSourceManager
        ├── extremeSampling (360-point peak-preserving chart queries)
        └── /datos Explorer UI + Downloads policy
```

Every scientific data source flows through five distinct layers:

1. **Worker pipeline:** A recurring BullMQ job in `apps/worker` discovers new files, downloads them,
   validates data quality flags (DQF), and stores points.
2. **Storage target:** High-frequency numeric readings go to InfluxDB 3; imagery and binary blobs
   go to MinIO; ledger rows (which files have been ingested) go to PostgreSQL.
3. **Web data provider:** An implementation of `ScientificDataProvider` in `apps/web/app/services/scientific-data/`
   queries the storage backend and formats results.
4. **Catalog & UI registration:** Declarations in `apps/web/app/lib/scientific-data.ts` expose the
   source, instrument, product, and channels in the `/datos` selector.
5. **Download & permissions policy:** Entries in `DOWNLOAD_POLICIES` and `DOWNLOAD_LOADERS` define
   which accounts can download charts (PNG) and raw data (CSV).

---

## 1. The worker ingestion pipeline (`apps/worker`)

### Declare the job contract

Follow [`docs/add-a-job.md`](add-a-job.md) to register the job across runtimes:

1. Add the job name and Zod payload schema in `packages/contracts/src/jobs.ts`:
   ```ts
   export const JOB_NAMES = {
     // ...
     newInstrumentPipeline: 'new-instrument-pipeline',
   } as const

   export const newInstrumentPipelinePayload = z.object({
     spacecraft: z.string().default('GOES-16'),
     daysBack: z.number().int().positive().default(3),
   })
   ```
2. Export JSON Schema:
   ```bash
   pnpm contracts:export
   ```
3. Mirror the payload in Python (`apps/worker/app/models/jobs.py`):
   ```python
   class NewInstrumentPipelinePayload(JobPayload):
       spacecraft: str = "GOES-16"
       days_back: int = Field(default=3, alias="daysBack")
   ```
4. Register the schedule in `packages/jobs/src/schedules.ts` if it runs periodically.

### Write the processor and decoder

Create `apps/worker/app/processors/<instrument>_pipeline.py` and register it in
`apps/worker/app/registry.py`:

- **Archive client (`app/clients/`):** Fetches files via HTTP/S3. Inspect headers like
  `Last-Modified` to avoid re-downloading unchanged files.
- **Async safety:** The BullMQ worker runs on `asyncio`. NetCDF4 decoding and synchronous SDK calls
  (InfluxDB, MinIO) must run on worker threads using `asyncio.to_thread` or the helper wrappers in
  `app/clients/` (e.g. `app.clients.influx`).
- **Quality filtering:** Filter out fill values (`_FillValue`, `-9999`) and points marked invalid
  by Data Quality Flags (`DQF != 0`).
- **Idempotency & invalidation:** InfluxDB 3 Core does not delete individual points. When a day is
  re-ingested or republished, any timestamp that was present in the old file but missing in the new
  file must be written with `valid = False` to invalidate the previous reading.

---

## 2. Storage conventions

### InfluxDB 3 (Time-series readings)

Use InfluxDB for scalar time-series observations (e.g., magnetic field, solar irradiance, particle flux):

| Field / Tag | Type      | Description                                                       |
| ----------- | --------- | ----------------------------------------------------------------- |
| Measurement | Table     | e.g. `mag_field`, `exis_irradiance`, `ehis_flux`                  |
| `time`      | Timestamp | Nanosecond or microsecond UTC timestamp                           |
| `product`   | Tag       | Instrument product code (e.g., `GEOF`, `SFXR`, `EHIS`)            |
| `channel`   | Tag       | Channel or component identifier (e.g., `EPN-x`, `xrsa`, `P1`)     |
| `satellite` | Tag       | Spacecraft or observatory code (e.g., `GOES-16`, `GOES-18`)       |
| `value`     | Field     | `float64` reading (in scientific units like `W/m²`, `nT`, `flux`) |
| `valid`     | Field     | `boolean` flag; readers must always filter `WHERE valid = true`   |

Write batches using `app.clients.influx.InfluxClient`:

```python
point = (
    Point(MEASUREMENT)
    .tag("product", PRODUCT)
    .tag("channel", channel_code)
    .tag("satellite", spacecraft)
    .field("value", float(val))
    .field("valid", True)
    .time(timestamp_ns)
)
```

### PostgreSQL (Catalogue ledger)

Add a table in `packages/db/prisma/schema.prisma` under the `solar` schema to track ingested files:

```prisma
model NewInstrumentFile {
  id               String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  filename         String    @unique
  date             DateTime  @db.Date
  spacecraft       String
  sourceModifiedAt DateTime? @map("source_modified_at")
  pointsCount      Int       @map("points_count")
  createdAt        DateTime  @default(now()) @map("created_at")

  @@map("new_instrument_files")
  @@schema("solar")
}
```

Run `pnpm db:migrate` to generate the migration. Remember that `gen_random_uuid()` is required for
worker inserts (see `docs/database-definition.md`).

---

## 3. Implement the Web service reader (`apps/web`)

Implement `ScientificDataProvider` in `apps/web/app/services/scientific-data/`:

```ts
export interface ScientificDataProvider {
  /** Queries data for the interactive chart (downsampled to <= 360 points). */
  query: (args: { query: ScientificDataQuery; jobId?: string }) => Promise<ScientificDataResult>
  /** Queries every stored point for full-resolution CSV data export. */
  queryFull?: (query: ScientificDataQuery) => Promise<ScientificDataResult>
}
```

### Downsampling for charts (`extremeSampling`)

To keep charts fast and responsive, the `/datos` explorer caps each series at 360 points. However,
astrophysical events (such as solar flares or geomagnetic spikes) must never be averaged away or
flattened:

- Use `createGoesReadings` (`apps/web/app/services/scientific-data/goesReadingsDataSource.ts`)
  for standard InfluxDB time-series.
- It executes a SQL query partition with `extremeBuckets(360)`, selecting the minimum and maximum
  reading of each bucket, plus the window's first, last, and peak values.
- Calculate window aggregates (`minimum`, `maximum`, `latest`) over the full dataset so summary cards
  reflect real extremes regardless of sampling.

### Registering the provider

Add your provider to `scientificDataSources` in `apps/web/app/services/scientific-data/index.ts`:

```ts
export const scientificDataSources = new ScientificDataSourceManager([
  createInstrumentRoutedDataSource(
    'GOES',
    {
      SUVI: suviArchive,
      EXIS: exisReadings,
      MAG: magReadings,
      NEW_INSTRUMENT: newInstrumentReadings,
    },
  ),
  createInstrumentRoutedDataSource('ROSAC', { ... }),
])
```

---

## 4. Catalog declaration and UI exposure

Update `apps/web/app/lib/scientific-data.ts`:

1. Add instrument and product codes to the types:
   ```ts
   export type ScientificInstrumentCode = 'SUVI' | 'EXIS' | 'MAG' | 'SEISS' | 'NEW_INST'
   export type ScientificProductCode = 'SFXR' | 'SFEU' | 'GEOF' | 'NEW_PROD'
   ```
2. Define products, channels, units, and provenance (`observed` vs. `simulated`):
   ```ts
   {
     code: 'NEW_PROD',
     instrument: 'NEW_INST',
     source: 'GOES',
     provenance: 'observed',
     unit: 'nT',
     channels: [
       { code: 'CH1', label: 'Channel 1' },
       { code: 'CH2', label: 'Channel 2' },
     ],
   }
   ```
3. Add user-facing labels and descriptions in `apps/web/messages/es.json` and `en.json`.
4. `InstrumentProductSelect` on `/datos` will automatically include the new options from the catalog.

---

## 5. Downloads and permissions policy

Every downloadable instrument must be explicitly declared in `apps/web/app/lib/downloads/policy.ts`:

```ts
export const DOWNLOAD_POLICIES: Partial<
  Record<ScientificSourceCode, Partial<Record<ScientificInstrumentCode, InstrumentDownloadPolicy>>>
> = {
  GOES: {
    NEW_INST: {
      png: ['download_resources'], // Chart image
      csv: ['download_resources', 'download_goes_resources'], // Raw data
    },
  },
}
```

Then map the corresponding data loader in `apps/web/app/services/downloads/loaders.ts`:

```ts
export const DOWNLOAD_LOADERS = {
  GOES: {
    NEW_INST: {
      png: chartData,
      csv: newInstrumentFullResolution,
    },
  },
}
```

_Note: If an instrument does not permit data downloads (e.g. SUVI imagery), omit it from the table._

---

## Testing checklist

Before submitting your PR, verify:

- **Worker suite:**
  ```bash
  cd apps/worker && uv run pytest tests/test_<instrument>_pipeline.py
  ```
- **Web service unit tests:**
  Add a unit test in `apps/web/tests/unit/services/scientific-data/<instrument>DataSource.test.ts`.
- **Download policy consistency:**
  ```bash
  pnpm --filter @lasce/web test:unit tests/unit/services/downloads/loaders.test.ts
  ```
  `loaders.test.ts` asserts that `DOWNLOAD_LOADERS` matches every entry in `DOWNLOAD_POLICIES`.
- **Full verification:**
  ```bash
  pnpm turbo run lint typecheck test
  ```
