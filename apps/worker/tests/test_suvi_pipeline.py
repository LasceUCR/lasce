"""The ``suvi-pipeline`` processor, with the archive served from memory.

The processor takes its window from the clock, so the frame the fake archive
serves is named after the current time rather than hard-coded.
"""

from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import AsyncMock

import httpx
import pytest

from app.models.jobs import SuviPipelinePayload
from app.processors import suvi_pipeline


def frame_name(observed: datetime) -> str:
    """A long-exposure GOES-19 Fe093 file name for ``observed``."""
    start = f"{observed:%Y%j%H%M%S}0"
    end = f"{observed + timedelta(seconds=1):%Y%j%H%M%S}0"
    return f"OR_SUVI-L1b-Fe093_G19_s{start}_e{end}_c{end}.fits.gz"


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


async def test_describes_the_frame_it_downloaded(monkeypatch: pytest.MonkeyPatch) -> None:
    name = frame_name(datetime.now(UTC) - timedelta(minutes=1))

    def handler(request: httpx.Request) -> httpx.Response:
        if str(request.url).endswith("/"):
            return httpx.Response(200, text=f'<a href="{name}">{name}</a>')
        return httpx.Response(200, content=b"fits-bytes")

    serve(monkeypatch, handler)
    job = AsyncMock()

    result = await suvi_pipeline.run(payload(), job)

    assert result["channel"] == "Fe093"
    assert result["spacecraft"] == 19
    assert result["available"] == 1
    assert result["file"] == {
        "name": name,
        "url": result["file"]["url"],
        "observedAt": result["file"]["observedAt"],
        "exposure": "long",
        "bytes": len(b"fits-bytes"),
    }
    assert result["file"]["url"].endswith(f"/suvi-l1b-fe094/{datetime.now(UTC):%Y/%m/%d}/{name}")
    job.updateProgress.assert_awaited_with(100)


async def test_reports_no_frame_without_downloading_anything(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    requested = serve(
        monkeypatch, lambda _: httpx.Response(200, text="<html><body>empty</body></html>")
    )

    result = await suvi_pipeline.run(payload(), AsyncMock())

    assert result["file"] is None
    assert not [url for url in requested if url.endswith(".fits.gz")]


async def test_a_frame_older_than_the_window_is_not_downloaded(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    name = frame_name(datetime.now(UTC) - timedelta(hours=3))
    requested = serve(
        monkeypatch, lambda _: httpx.Response(200, text=f'<a href="{name}">{name}</a>')
    )

    result = await suvi_pipeline.run(payload(lookbackMinutes=10), AsyncMock())

    assert result["file"] is None
    assert not [url for url in requested if url.endswith(".fits.gz")]
