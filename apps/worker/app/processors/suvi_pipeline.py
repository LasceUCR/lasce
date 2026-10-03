"""``suvi-pipeline``: fetch the most recent SUVI L1b frame for one channel,
decode it, catalogue it and render its pixels as an illustration.

All archive knowledge lives in :mod:`app.clients.suvi`; this processor only
decides the window, reports progress and hands off the decoded FITS header
and pixel matrix. The header goes to
:class:`app.services.process_headers.ProcessHeaders`, which writes the
catalogue row (Postgres) and the metric points (InfluxDB). The matrix goes to
:func:`app.services.suvi_preview.publish_preview`, which renders it straight
to a WebP image (these images are illustrative only, not a scientific product) and
stores both a per-frame archival copy and the always-latest WebP the PoC
viewer at `/suvi` reads (see `docs/suvi-downloader.md`).
"""

import asyncio
import gzip
import io
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from astropy.io import fits

from app.clients.storage import get_object_storage
from app.clients.suvi import SuviChannel, SuviDownloader
from app.logging import get_logger
from app.models.jobs import SuviPipelinePayload
from app.services.process_headers import ProcessHeaders
from app.services.suvi_preview import publish_preview

log = get_logger(__name__)

REQUEST_TIMEOUT = 120


def _build_search_params(payload: SuviPipelinePayload) -> tuple[SuviChannel, timedelta]:
    """Extract search parameters from payload."""
    return SuviChannel(payload.channel), timedelta(minutes=payload.lookback_minutes)


def _handle_no_frames_found(channel: SuviChannel, payload: SuviPipelinePayload) -> dict[str, Any]:
    """Build result when no frames are available in the search window."""
    log.info(
        "no suvi frame in window",
        channel=channel.value,
        spacecraft=payload.spacecraft,
        lookback_minutes=payload.lookback_minutes,
    )
    return {
        "channel": channel.value,
        "spacecraft": payload.spacecraft,
        "file": None,
        "pipelineDate": datetime.now(UTC).isoformat(),
    }


def _decode_fits(compressed_bytes: bytes) -> tuple[Any, Any]:
    """Gunzip and open the frame, and pull out its header and data matrix.

    This runs on a worker thread (see :func:`run`), so everything the caller
    needs has to be extracted here, before returning. ``fits.open`` hands back
    a lazy ``HDUList`` backed by the open in-memory buffer; the header and
    data array must be fully read out — and the file closed via the ``with``
    block — while still on the thread, or the lazy object would escape it and
    get touched from the event loop after all.
    """
    decompressed = gzip.decompress(compressed_bytes)
    with fits.open(io.BytesIO(decompressed)) as hdul:
        primary_hdu = hdul[0] if hdul[0].data is not None else hdul[1]
        # `.copy()`, not `dict(...)`: a plain dict collapses the repeated
        # COMMENT/HISTORY keywords into one opaque `_HeaderCommentaryCards`
        # value, which loses all but the fact that they existed and is not
        # JSON serialisable. A copied Header keeps its `.cards` list, which
        # is what `ProcessHeaders` sanitises. The copy detaches it from the
        # buffer the `with` block is about to close.
        header = primary_hdu.header.copy()
        data_matrix = primary_hdu.data.copy() if primary_hdu.data is not None else None
    return header, data_matrix


def _build_success_result(
    channel: SuviChannel,
    download: Any,
    available_count: int,
    frame_id: uuid.UUID,
    preview: str | None,
) -> dict[str, Any]:
    """Build successful result with downloaded file metadata."""
    log.info(
        "downloaded suvi frame",
        channel=channel.value,
        spacecraft=download.file.spacecraft,
        name=download.file.name,
        bytes=len(download.content),
    )

    return {
        "channel": channel.value,
        "spacecraft": download.file.spacecraft,
        "file": {
            "name": download.file.name,
            "url": download.file.url,
            "observedAt": download.file.start.isoformat(),
            "exposure": download.file.exposure,
            "bytes": len(download.content),
        },
        "available": available_count,
        "frameId": str(frame_id),
        "preview": preview,
        "pipelineDate": datetime.now(UTC).isoformat(),
    }


async def run(payload: SuviPipelinePayload, job: Any) -> dict[str, Any]:
    channel, lookback = _build_search_params(payload)

    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT, follow_redirects=True) as client:
        downloader = SuviDownloader(client, spacecraft=payload.spacecraft)
        available = await downloader.list_recent(channel, lookback)
        await job.updateProgress(50)

        if not available:
            await job.updateProgress(100)
            return _handle_no_frames_found(channel, payload)

        download = await downloader.fetch(available[0])

    header, data_matrix = await asyncio.to_thread(_decode_fits, download.content)
    await job.updateProgress(75)

    fields = ProcessHeaders.parse(header, download.file)
    frame_id = await ProcessHeaders().persist(fields)
    preview: str | None = None
    if data_matrix is not None:
        preview = await publish_preview(get_object_storage(), data_matrix, fields, frame_id)
    await job.updateProgress(100)

    return _build_success_result(channel, download, len(available), frame_id, preview)
