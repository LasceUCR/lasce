"""The ``suvi-pipeline`` processor, with the archive served from memory.

The processor takes its window from the clock, so the frame the fake archive
serves is named after the current time rather than hard-coded. The archive
serves a real gzipped FITS file — the pipeline now actually decodes it — built
with the same header cards ``test_process_headers.py`` uses, so a change to
one that breaks the other is caught here too.
"""

import gzip
import io
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import AsyncMock

import httpx
import numpy as np
import pytest
from astropy.io import fits

from app.models.jobs import SuviPipelinePayload
from app.processors import suvi_pipeline
from app.services.process_headers import ProcessHeaders

FRAME_ID = uuid.UUID("22222222-2222-2222-2222-222222222222")
PREVIEW_KEY = "suvi/g19/fe093/20260918T041407.webp"

HEADER_CARDS: dict[str, Any] = {
    "DATE-OBS": "2026-09-18T04:14:07.332",
    "WAVELNTH": 94.0,
    "TELESCOP": "G19",
    "EXPTIME": 0.999728,
    "CRPIX1": 666.8828548,
    "CRPIX2": 657.5104303,
    "RSUN": 381.9732042,
    "CONT_FLG": 0,
    "ECLIPSE": 0,
    "IMG_MEAN": 0.038145,
    "IMG_MAX": 19.6935215,
    "IMG_MIN": -9.6789522,
    "IMG_SDEV": 0.1334417,
    "DER_SNR": 0.274973,
    "SAT_PIX": 0,
    "FIX_PIX": 0,
    "CCD_TMP1": -55.1504,
    "CCD_BIAS": 46.0801,
}


def frame_name(observed: datetime) -> str:
    """A long-exposure GOES-19 Fe093 file name for ``observed``."""
    start = f"{observed:%Y%j%H%M%S}0"
    end = f"{observed + timedelta(seconds=1):%Y%j%H%M%S}0"
    return f"OR_SUVI-L1b-Fe093_G19_s{start}_e{end}_c{end}.fits.gz"


def gzipped_fits_bytes() -> bytes:
    """A minimal, real, gzipped FITS frame carrying the header cards above.

    ``_decode_fits`` runs ``gzip.decompress`` then ``fits.open`` for real now,
    so the fake archive has to serve something that survives both, not the
    placeholder ``b"fits-bytes"`` it used to.
    """
    # A real (if tiny) data array: `_decode_fits` picks `hdul[1]` when the
    # primary HDU has none, and this file only has a primary HDU.
    hdu = fits.PrimaryHDU(data=np.zeros((4, 4), dtype=np.float32))
    for keyword, value in HEADER_CARDS.items():
        hdu.header[keyword] = value
    buffer = io.BytesIO()
    hdu.writeto(buffer)
    return gzip.compress(buffer.getvalue())


def payload(**changes: Any) -> SuviPipelinePayload:
    return SuviPipelinePayload.model_validate(
        {"channel": "Fe093", "spacecraft": 19, "lookbackMinutes": 10, **changes}
    )


def serve(monkeypatch: pytest.MonkeyPatch, handler: Any) -> list[str]:
    """Point the processor's HTTP client at ``handler``, recording every URL."""
    requested: list[str] = []
    original = httpx.AsyncClient

    def recording(request: httpx.Request) -> httpx.Response:
        requested.append(str(request.url))
        return handler(request)

    transport = httpx.MockTransport(recording)
    monkeypatch.setattr(
        suvi_pipeline.httpx,
        "AsyncClient",
        lambda *args, **kwargs: original(*args, **{**kwargs, "transport": transport}),
    )
    return requested


def mock_process_headers(monkeypatch: pytest.MonkeyPatch) -> AsyncMock:
    """The persistence step is covered on its own in test_process_headers.py;
    here only the pipeline's shape (progress, the returned dict) is under test.
    """
    persist = AsyncMock(return_value=FRAME_ID)
    monkeypatch.setattr(ProcessHeaders, "persist", persist)
    return persist


def mock_publish_preview(
    monkeypatch: pytest.MonkeyPatch, preview: str | None = PREVIEW_KEY
) -> AsyncMock:
    """Rendering and uploading the preview PNG is covered on its own in
    test_suvi_preview.py; here only the pipeline's shape (the ``preview`` key) is under test.
    """
    publish = AsyncMock(return_value=preview)
    monkeypatch.setattr(suvi_pipeline, "publish_preview", publish)
    return publish


async def test_describes_the_frame_it_downloaded(monkeypatch: pytest.MonkeyPatch) -> None:
    name = frame_name(datetime.now(UTC) - timedelta(minutes=1))
    content = gzipped_fits_bytes()

    def handler(request: httpx.Request) -> httpx.Response:
        if str(request.url).endswith("/"):
            return httpx.Response(200, text=f'<a href="{name}">{name}</a>')
        return httpx.Response(200, content=content)

    serve(monkeypatch, handler)
    persist = mock_process_headers(monkeypatch)
    publish = mock_publish_preview(monkeypatch)
    job = AsyncMock()

    result = await suvi_pipeline.run(payload(), job)

    assert result["channel"] == "Fe093"
    assert result["spacecraft"] == 19
    assert result["available"] == 1
    assert result["frameId"] == str(FRAME_ID)
    assert result["file"] == {
        "name": name,
        "url": result["file"]["url"],
        "observedAt": result["file"]["observedAt"],
        "exposure": "long",
        "bytes": len(content),
    }
    assert result["file"]["url"].endswith(f"/suvi-l1b-fe094/{datetime.now(UTC):%Y/%m/%d}/{name}")
    assert "block" not in result
    assert result["preview"] == PREVIEW_KEY
    persist.assert_awaited_once()
    publish.assert_awaited_once()
    job.updateProgress.assert_any_await(50)
    job.updateProgress.assert_any_await(75)
    job.updateProgress.assert_awaited_with(100)


async def test_reports_no_frame_without_downloading_anything(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    requested = serve(
        monkeypatch, lambda _: httpx.Response(200, text="<html><body>empty</body></html>")
    )
    persist = mock_process_headers(monkeypatch)
    publish = mock_publish_preview(monkeypatch)

    result = await suvi_pipeline.run(payload(), AsyncMock())

    assert result["file"] is None
    assert "block" not in result
    assert not [url for url in requested if url.endswith(".fits.gz")]
    persist.assert_not_awaited()
    publish.assert_not_awaited()


async def test_a_frame_older_than_the_window_is_not_downloaded(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    name = frame_name(datetime.now(UTC) - timedelta(hours=3))
    requested = serve(
        monkeypatch, lambda _: httpx.Response(200, text=f'<a href="{name}">{name}</a>')
    )
    persist = mock_process_headers(monkeypatch)
    publish = mock_publish_preview(monkeypatch)

    result = await suvi_pipeline.run(payload(lookbackMinutes=10), AsyncMock())

    assert result["file"] is None
    assert not [url for url in requested if url.endswith(".fits.gz")]
    persist.assert_not_awaited()
    publish.assert_not_awaited()
