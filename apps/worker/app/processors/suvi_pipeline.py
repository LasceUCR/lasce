"""``suvi-pipeline``: fetch the most recent SUVI L1b frame for one channel.

All archive knowledge lives in :mod:`app.clients.suvi`; this processor only
decides the window, reports progress and describes what it found. Decoding the
FITS payload is deliberately not done here yet — nothing consumes the image
array, and the astropy dependency it would need is not worth carrying until
something does.
"""

from datetime import UTC, datetime, timedelta
from typing import Any
import io
from astropy.io import fits
import gzip

import httpx

from app.clients.suvi import SuviChannel, SuviDownloader
from app.logging import get_logger
from app.models.jobs import SuviPipelinePayload

log = get_logger(__name__)

REQUEST_TIMEOUT = 120


def _build_search_params(payload: SuviPipelinePayload) -> tuple[SuviChannel, timedelta]:
  """Extract search parameters from payload."""
  return SuviChannel(payload.channel), timedelta(minutes=payload.lookback_minutes)


def _handle_no_frames_found(
  channel: SuviChannel, payload: SuviPipelinePayload
) -> dict[str, Any]:
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


def _decompress_and_open_fits(compressed_bytes: bytes) -> Any:
  """Decompress gzip content and return open FITS HDU list."""
  decompressed = gzip.decompress(compressed_bytes)
  return fits.open(io.BytesIO(decompressed))


def _extract_fits_data(hdul: Any) -> tuple[dict[str, Any], Any]:
  """Extract headers and data matrix from FITS HDU list."""
  primary_hdu = hdul[0] if hdul[0].data is not None else hdul[1]
  headers = dict(primary_hdu.header)
  data_matrix = primary_hdu.data
  return headers, data_matrix


def _log_fits_contents(headers: dict[str, Any], data_matrix: Any) -> None:
  """Log extracted FITS headers and data matrix."""
  log.info(headers)
  log.info(data_matrix)


def _build_success_result(
  channel: SuviChannel, download: Any, available_count: int
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

  hdul = _decompress_and_open_fits(download.content)
  with hdul:
    headers, data_matrix = _extract_fits_data(hdul)
    _log_fits_contents(headers, data_matrix)

  await job.updateProgress(100)
  return _build_success_result(channel, download, len(available))
