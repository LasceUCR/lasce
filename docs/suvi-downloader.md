# Downloading SUVI images

`apps/worker/app/clients/suvi.py` reads SUVI L1b frames from NOAA's public GOES archive. It
replaces the NOAA example script the pipeline started from: the archive knowledge lives in one
module, the parsing is pure functions you can test without a network, and a processor is left
deciding only which channel it wants and how far back to look.

The module never writes to disk. `download()` hands back bytes, so the caller chooses what happens
next — MinIO, astropy, or nothing at all.

## Using it

```python
from datetime import timedelta

import httpx

from app.clients.suvi import SuviChannel, SuviDownloader

async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
    downloader = SuviDownloader(client, spacecraft=19)
    downloads = await downloader.download(SuviChannel.FE093, timedelta(minutes=30))

for download in downloads:
    print(download.file.name, download.file.exposure, len(download.content))
```

The caller owns the HTTP client. That is deliberate: one client can serve several channels in the
same job, and its timeouts stay in one place instead of being buried in this module.

### Parameters

| Parameter    | Default            | Meaning                                                     |
| ------------ | ------------------ | ----------------------------------------------------------- |
| `channel`    | required           | The passband, as a `SuviChannel`                            |
| `spacecraft` | `19`               | GOES 16, 17, 18 or 19. Anything else raises `ValueError`    |
| `lookback`   | `timedelta(10min)` | How far back from now to look                               |
| `exposure`   | `'long'`           | `'long'`, `'short'` or `'both'`                             |
| `limit`      | `1`                | How many of the most recent frames to download              |
| `now`        | the clock          | Injectable end of the window; the tests use it to pin a day |

### Listing without downloading

`list_recent()` does everything `download()` does except fetch the bytes, and `fetch()` then
downloads one frame you picked out of that list. Use the pair whenever you want to decide something
from the metadata first — that is what `suvi_pipeline.py` does, so a job with nothing in its window
reports it without spending a request.

```python
available = await downloader.list_recent(SuviChannel.HE303, timedelta(minutes=30))
if available:
    download = await downloader.fetch(available[0])
```

Both return frames **most recent first**, so `[0]` is the latest image.

## What a frame tells you

`SuviFile` is built entirely from the archive's own file name, with no need to open the FITS:

```python
SuviFile(
    name='OR_SUVI-L1b-Fe093_G19_s20262610344072_e20262610344082_c20262610344250.fits.gz',
    url='https://data.ngdc.noaa.gov/.../suvi-l1b-fe094/2026/09/18/OR_SUVI-L1b-Fe093_G19_s....gz',
    channel=SuviChannel.FE093,
    spacecraft=19,
    start=datetime(2026, 9, 18, 3, 44, 7, 200000, tzinfo=UTC),
    end=datetime(2026, 9, 18, 3, 44, 8, 200000, tzinfo=UTC),
    exposure='long',
)
```

The stamps are `YYYYJJJHHMMSSt`, where the trailing digit is tenths of a second. Exposure comes from
the gap between them: one second is a long exposure, zero a short one. A name that parses to
anything else is skipped rather than raised on, because a directory listing also carries sort links,
parent links and the occasional stray file.

## The channel trap

The channel token in the file name and the directory it lives in **do not match for two channels**:

| `SuviChannel` | Directory          | Token in file names |
| ------------- | ------------------ | ------------------- |
| `FE093`       | `suvi-l1b-fe094`   | `Fe093`             |
| `FE131`       | `suvi-l1b-fe131`   | `Fe131`             |
| `FE171`       | `suvi-l1b-fe171`   | `Fe171`             |
| `FE195`       | `suvi-l1b-fe195`   | `Fe195`             |
| `FE284`       | `suvi-l1b-fe284`   | `Fe284`             |
| `HE303`       | `suvi-l1b-he304`   | `He303`             |

GOES-19 writes `Fe093` and `He303` into directories still named after the wavelengths the earlier
spacecraft used. The enum carries both spellings, so `list_recent()` can drop a frame whose name
disagrees with the channel that was asked for. Never build one of these paths by lowercasing the
channel value.

## The archive lags about 15 minutes

NOAA publishes L1b frames well after they are observed. A 10 minute window is often **empty**:
measured at 03:57 UTC, the most recent Fe093 frame was from 03:44 — a lag of 13 minutes. That is the
archive's publication delay, not a failure, and an empty window is a normal answer rather than an
error.

Two consequences:

- Use a lookback of 30 minutes or more if the job has to come back with an image.
- Handle the empty list. `download()` returns `[]` and does not raise.

## Windows that cross midnight

The archive stores one directory per UTC day, so a window spanning midnight covers two of them.
`day_urls()` enumerates every day the window touches and `list_recent()` lists them concurrently. A
day the archive does not have answers 404 and is skipped; any other HTTP error propagates as
`httpx.HTTPStatusError` and fails the job.

## Limits

Both the directory listing and the frame are streamed and abandoned the moment they cross a ceiling
(`MAX_LISTING_BYTES`, 8 MB; `MAX_FILE_BYTES`, 16 MB), so an unexpectedly huge response never lands
on the heap in full. A real compressed frame is 1–2 MB.

## Testing against it

`apps/worker/tests/test_suvi.py` never touches the network. The parsing is pure, and the client is
driven with `httpx.MockTransport` plus a fixed `now`:

```python
def handler(request: httpx.Request) -> httpx.Response:
    if str(request.url).endswith('/'):
        return httpx.Response(200, text=f'<a href="{NAME}">{NAME}</a>')
    return httpx.Response(200, content=b'fits-bytes')

async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
    files = await SuviDownloader(client).list_recent(SuviChannel.FE093, now=NOW)
```

Pass `now=` rather than freezing the clock, and name frames with real archive file names — the
spelling is the thing under test.

## Current wiring

The client and `apps/worker/app/processors/suvi_pipeline.py` are on disk, but the `suvi-pipeline`
job is **not wired up**: there is no entry in `packages/contracts/src/jobs.ts`, no
`SuviPipelinePayload` in `apps/worker/app/models/jobs.py`, and no row in `app/registry.py`, even
though `packages/contracts/schema/suvi-pipeline.json` is present. Until those three are added, the
worker cannot run the job and `tests/test_contracts.py` fails on the mismatch. The steps are in
[`add-a-job.md`](add-a-job.md); the payload the processor expects is `channel`, `spacecraft` and
`lookbackMinutes`.

The client itself needs none of that — it is importable and usable on its own today.
