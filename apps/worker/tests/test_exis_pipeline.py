"""The ``exis-pipeline`` processor, with the archive served from memory.

The processor takes its window from the clock, so the days the fake archive
serves are named relative to today rather than hard-coded. The file it serves
is a real NetCDF built by ``test_exis_readings``'s fixture, so the pipeline
decodes for real. Persistence and the "already ingested?" lookup are mocked:
both are covered in ``test_exis_readings.py``, and only the pipeline's shape
(which day, whether it downloads, progress, the returned dict) is under test.
"""

import uuid
from collections.abc import Callable
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock

import httpx
import pytest

from app.models.jobs import ExisPipelinePayload
from app.processors import exis_pipeline
from app.services.exis_readings import ExisReadings
from tests.test_exis_readings import sfxr_netcdf

FILE_ID = uuid.UUID("44444444-4444-4444-4444-444444444444")
MODIFIED = "Mon, 28 Sep 2026 04:17:28 GMT"
MODIFIED_AT = datetime(2026, 9, 28, 4, 17, 28, tzinfo=UTC)
TODAY = datetime.now(UTC).date()


def name(day: date) -> str:
    return f"ops_exis-l1b-sfxr_g19_d{day:%Y%m%d}_v0-0-0.nc"


def payload(**changes: Any) -> ExisPipelinePayload:
    return ExisPipelinePayload.model_validate(
        {"product": "SFXR", "spacecraft": 19, "lookbackDays": 3, **changes}
    )


def archive(
    days: list[date],
    content: bytes,
    modified: dict[date, str | None] | None = None,
) -> Callable[[httpx.Request], httpx.Response]:
    """Month listings holding ``days``, a ``HEAD`` per file, and its bytes."""
    by_name = {name(day): day for day in days}

    def handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if url.endswith("/"):
            month = url.rstrip("/").rsplit("/", 2)[-2:]
            links = "".join(
                f'<a href="{entry}">{entry}</a>'
                for entry, day in by_name.items()
                if [f"{day:%Y}", f"{day:%m}"] == month
            )
            return httpx.Response(200, text=links)
        day = by_name[url.rsplit("/", 1)[-1]]
        stamp = (modified or {}).get(day, MODIFIED)
        headers = {"Last-Modified": stamp} if stamp else {}
        if request.method == "HEAD":
            return httpx.Response(200, headers=headers)
        return httpx.Response(200, content=content, headers=headers)

    return handler


def serve(monkeypatch: pytest.MonkeyPatch, handler: Any) -> list[str]:
    """Point the processor's HTTP client at ``handler``, recording every request."""
    requested: list[str] = []
    original = httpx.AsyncClient

    def recording(request: httpx.Request) -> httpx.Response:
        requested.append(f"{request.method} {request.url}")
        response: httpx.Response = handler(request)
        return response

    transport = httpx.MockTransport(recording)
    monkeypatch.setattr(
        exis_pipeline.httpx,
        "AsyncClient",
        lambda *args, **kwargs: original(*args, **{**kwargs, "transport": transport}),
    )
    return requested


def mock_readings(
    monkeypatch: pytest.MonkeyPatch, ingested: dict[str, datetime | None] | None = None
) -> AsyncMock:
    """``ingested`` maps a file name to the ``Last-Modified`` already recorded for it."""

    async def ingested_modified_at(file: Any) -> datetime | None:
        return (ingested or {}).get(file.name)

    monkeypatch.setattr(ExisReadings, "ingested_modified_at", staticmethod(ingested_modified_at))
    persist = AsyncMock(return_value=FILE_ID)
    monkeypatch.setattr(ExisReadings, "persist", persist)
    return persist


def downloads(requested: list[str]) -> list[str]:
    return [entry for entry in requested if entry.startswith("GET") and entry.endswith(".nc")]


async def test_ingests_the_newest_day_in_the_window(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    yesterday, before = TODAY - timedelta(days=1), TODAY - timedelta(days=2)
    content = sfxr_netcdf(tmp_path)
    requested = serve(monkeypatch, archive([before, yesterday], content))
    persist = mock_readings(monkeypatch)
    job = AsyncMock()

    result = await exis_pipeline.run(payload(), job)

    assert result["product"] == "SFXR"
    assert result["spacecraft"] == 19
    assert result["available"] == 2
    assert result["skipped"] is False
    assert result["fileId"] == str(FILE_ID)
    assert result["points"] == {"0.05-0.4nm": 3, "0.1-0.8nm": 3}
    assert result["file"] == {
        "name": name(yesterday),
        "url": result["file"]["url"],
        "day": yesterday.isoformat(),
        "version": "0-0-0",
        "modifiedAt": MODIFIED_AT.isoformat(),
        "bytes": len(content),
    }
    assert result["file"]["url"].endswith(f"/exis-l1b-sfxr/{yesterday:%Y/%m}/{name(yesterday)}")
    assert downloads(requested) == [f"GET {result['file']['url']}"]
    decoded, file, modified_at = persist.await_args.args
    assert file.name == name(yesterday)
    assert modified_at == MODIFIED_AT
    assert decoded.satellite == "G19"
    job.updateProgress.assert_any_await(25)
    job.updateProgress.assert_any_await(50)
    job.updateProgress.assert_any_await(75)
    job.updateProgress.assert_awaited_with(100)


async def test_an_unchanged_day_is_not_downloaded_again(monkeypatch: pytest.MonkeyPatch) -> None:
    yesterday = TODAY - timedelta(days=1)
    requested = serve(monkeypatch, archive([yesterday], b""))
    persist = mock_readings(monkeypatch, {name(yesterday): MODIFIED_AT})
    job = AsyncMock()

    result = await exis_pipeline.run(payload(), job)

    assert result["skipped"] is True
    assert result["available"] == 1
    assert result["file"] is None
    assert downloads(requested) == []
    persist.assert_not_awaited()
    job.updateProgress.assert_awaited_with(100)


async def test_a_republished_older_day_is_ingested_when_the_newest_is_current(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    yesterday, before = TODAY - timedelta(days=1), TODAY - timedelta(days=2)
    republished = "Tue, 29 Sep 2026 04:24:00 GMT"
    serve(
        monkeypatch,
        archive([before, yesterday], sfxr_netcdf(tmp_path), {before: republished}),
    )
    persist = mock_readings(monkeypatch, {name(yesterday): MODIFIED_AT, name(before): MODIFIED_AT})

    result = await exis_pipeline.run(payload(), AsyncMock())

    assert result["file"]["name"] == name(before)
    assert result["file"]["modifiedAt"] == "2026-09-29T04:24:00+00:00"
    persist.assert_awaited_once()


async def test_a_file_without_last_modified_is_always_ingested(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    yesterday = TODAY - timedelta(days=1)
    serve(monkeypatch, archive([yesterday], sfxr_netcdf(tmp_path), {yesterday: None}))
    persist = mock_readings(monkeypatch, {name(yesterday): None})

    result = await exis_pipeline.run(payload(), AsyncMock())

    assert result["file"]["modifiedAt"] is None
    assert persist.await_args.args[2] is None


async def test_reports_no_file_without_downloading_anything(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    requested = serve(monkeypatch, archive([TODAY - timedelta(days=20)], b""))
    persist = mock_readings(monkeypatch)
    job = AsyncMock()

    result = await exis_pipeline.run(payload(), job)

    assert result["file"] is None
    assert result["available"] == 0
    assert result["skipped"] is False
    assert not [entry for entry in requested if entry.endswith(".nc")]
    persist.assert_not_awaited()
    job.updateProgress.assert_awaited_with(100)


async def test_a_date_backfills_exactly_that_day(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    day = date(2025, 1, 5)
    requested = serve(monkeypatch, archive([day, date(2025, 1, 6)], sfxr_netcdf(tmp_path)))
    mock_readings(monkeypatch)

    result = await exis_pipeline.run(payload(date="2025-01-05"), AsyncMock())

    assert result["available"] == 1
    assert result["file"]["day"] == "2025-01-05"
    listings = [entry for entry in requested if entry.endswith("/")]
    assert listings == [
        "GET https://data.ngdc.noaa.gov/platforms/solar-space-observing-satellites/goes/"
        "goes19/l1b/exis-l1b-sfxr/2025/01/"
    ]
