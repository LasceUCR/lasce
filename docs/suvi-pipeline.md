# The SUVI pipeline job

`apps/worker/app/processors/suvi_pipeline.py` is the orchestrator for the `suvi-pipeline` job: it
does not know how to talk to the NOAA archive, decode a FITS file, write a catalogue row, or render
a pixel matrix. It only decides the search window, calls the three modules that do each of those
things in order, and reports progress back to BullMQ. This document is the conceptual map of that
orchestration — how a request for "the latest frame of one channel" becomes a catalogued,
illustrated image. For the archive/decoding details themselves, see
[`docs/suvi-downloader.md`](suvi-downloader.md).

## Why it is a thin orchestrator

Every piece of domain knowledge the pipeline touches already has a single owner:

| Concern                                   | Owner                                     |
| ----------------------------------------- | ----------------------------------------- |
| Talking to the NOAA archive               | `app/clients/suvi.py` (`SuviDownloader`)  |
| Decoding the FITS file                    | `_decode_fits`, private to this processor |
| Cataloguing the frame (Postgres + Influx) | `app/services/process_headers.py`         |
| Rendering the illustrative WebP (MinIO)    | `app/services/suvi_preview.py`            |

`suvi_pipeline.run` exists so those three pieces get called **in the right order, with the right
data handed between them**, and so a caller (BullMQ, or a test) has one entry point. It does not
duplicate any of their logic — the module docstring at the top of the file is the one-paragraph
version of this document.

## The request: `SuviPipelinePayload`

Defined once in `packages/contracts/src/jobs.ts` and mirrored in `apps/worker/app/models/jobs.py`:

| Field             | Type                                         | Default | Meaning                            |
| ----------------- | -------------------------------------------- | ------- | ---------------------------------- |
| `channel`         | one of `Fe093 Fe131 Fe171 Fe195 Fe284 He303` | —       | Which passband to fetch            |
| `spacecraft`      | `int`                                        | `19`    | GOES satellite number              |
| `lookbackMinutes` | `int`, 1–1440                                | `10`    | How far back to search for a frame |

The job asks for "whatever is newest in this window," never for a specific frame by name. That is
why `lookbackMinutes` exists at all: given the archive's own ~15 minute publication lag (see
[`suvi-downloader.md`](suvi-downloader.md#the-archive-lags-about-15-minutes)), a short window can
legitimately come back empty, and the pipeline treats that as a normal outcome rather than a
failure. `packages/jobs/src/schedules.ts` currently fires this job every 3 minutes per channel with
a 5 minute lookback, so most runs are catching up on a frame the previous run had not seen yet.

## The four stages of `run()`

```
list_recent()  ──►  fetch()  ──►  _decode_fits()  ──►  ProcessHeaders  ──►  publish_preview()
  (metadata)         (bytes)      (header + matrix)    (catalogue row)      (rendered WebP)
```

1. **List, don't download, first.** `downloader.list_recent(channel, lookback)` asks the archive
   for metadata only. If the window is empty, the pipeline reports progress `100` and returns a
   `file: null` result immediately (`_handle_no_frames_found`) — no bytes are fetched, no header is
   parsed, nothing is written anywhere. This is the common case for a tight lookback and is logged
   at `info`, not treated as an error.

2. **Fetch exactly one frame.** `available` is sorted most-recent-first by the client, so
   `available[0]` is the newest frame in the window. The pipeline never fetches more than one frame
   per run — catching up on a backlog happens by letting the schedule fire again, not by looping
   inside one job.

3. **Decode off the event loop.** `_decode_fits` gunzips the response and opens it with astropy,
   extracting a **copied** header and a **copied** data matrix before the `with fits.open(...)`
   block closes. This runs inside `asyncio.to_thread`, because decoding a ~2 MB frame synchronously
   on the event loop would stall every other job the worker is handling concurrently. Nothing tied
   to the (now closed) `HDUList` is allowed to escape the thread — that is why both objects are
   copied rather than referenced.

4. **Catalogue the header, then render the matrix.** `ProcessHeaders.parse` + `.persist()` writes
   the Postgres row and the Influx metric point and returns a `frame_id` — this happens **before**
   the matrix is touched, so a frame is always catalogued even if rendering were to fail.
   `publish_preview(...)` then renders the matrix directly to an 8-bit WebP (these images are
   illustrative only, not a scientific product — there is no compression or quantisation step to
   reverse) and stores two copies in MinIO: a per-frame archival copy, whose key is written back
   onto that same catalogue row (`preview_file`), and the always-latest copy the `/suvi` PoC viewer
   reads. This step is skipped only if the FITS file had no data HDU at all (`data_matrix is
None`), which the pipeline treats as a valid — if unusual — frame.

Progress is reported at four points (`0 → 50 → 75 → 100`) so a caller watching the BullMQ job can
tell listing, fetching+decoding, and cataloguing+rendering apart without needing finer granularity
than that.

## What a run returns

```jsonc
{
  "channel": "Fe093",
  "spacecraft": 19,
  "file": {
    "name": "...",
    "url": "...",
    "observedAt": "...",
    "exposure": "long",
    "bytes": 1234567,
  },
  "available": 3, // how many frames were in the window, not just the one fetched
  "frameId": "…", // the solar.suvi_frames row this run wrote or updated
  "preview": "suvi/g19/fe093/20260922T120000.webp", // the per-frame archival key
  "pipelineDate": "2026-09-22T…Z",
}
```

`file` and `preview` are `null` together when the window was empty — there is no partial result
where a file was found but the preview is missing, except in the one case described above where
the FITS frame legitimately carries no data matrix.

## What is deliberately out of scope here

- **Archive quirks** (the channel/directory name mismatch, midnight-crossing windows, response size
  limits) — all handled inside `SuviDownloader`, documented in
  [`suvi-downloader.md`](suvi-downloader.md#the-channel-trap).
- **FITS header sanitisation** (numpy scalars, `Undefined`, `NaN`, missing optional cards) — handled
  by `ProcessHeaders`, documented in
  [`suvi-downloader.md`](suvi-downloader.md#persisting-a-frame).
- **How the WebP is rendered and stored** — owned by `app/services/suvi_preview.py`, documented in
  [`suvi-downloader.md`](suvi-downloader.md#pixel-blocks).
- **How the WebP reaches the browser** (`/api/suvi/preview/[satellite]/[channel]`, the polling
  `SuviPreview` component) — documented in
  [`suvi-downloader.md`](suvi-downloader.md#vista-previa-proof-of-concept).

If a change touches any of those, update that section of `suvi-downloader.md` instead of this file.
Update this file when the **order of stages**, the **payload shape**, or **what a run returns**
changes.
