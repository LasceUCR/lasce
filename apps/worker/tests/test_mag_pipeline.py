"""The ``mag-pipeline`` processor, with the archive served from memory.

The processor takes its window from the clock, so the days the fake archive
serves are named relative to today rather than hard-coded. The file it serves
is a real NetCDF built by ``test_mag_readings``'s fixture, so the pipeline
decodes for real. Persistence and the "already ingested?" lookup are mocked:
both are covered in ``test_mag_readings.py``, and only the pipeline's shape
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

from app.models.jobs import MagPipelinePayload
from app.processors import mag_pipeline
from app.services.mag_readings import IngestedFile, MagReadings
from tests.test_mag_readings import mag_netcdf

FILE_ID = uuid.UUID("55555555-5555-5555-5555-555555555555")
MODIFIED = "Thu, 15 Oct 2026 04:02:11 GMT"
MODIFIED_AT = datetime(2026, 10, 15, 4, 2, 11, tzinfo=UTC)
TODAY = datetime.now(UTC).date()


def name(day: date) -> str:
    return f"dn_magn-l2-avg1m_g19_d{day:%Y%m%d}_v2-0-4.nc"


def payload(**changes: Any) -> MagPipelinePayload:
    return MagPipelinePayload.model_validate({"spacecraft": 19, "lookbackDays": 3, **changes})


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
        mag_pipeline.httpx,
        "AsyncClient",
        lambda *args, **kwargs: original(*args, **{**kwargs, "transport": transport}),
    )
    return requested


def mock_readings(
    monkeypatch: pytest.MonkeyPatch, ingested: dict[str, datetime | None] | None = None
) -> AsyncMock:
    """``ingested`` maps each file name already in the catalogue to the
    ``Last-Modified`` recorded for it; a name missing from it was never ingested.
    """

    async def lookup(file: Any) -> IngestedFile | None:
        if file.name not in (ingested or {}):
            return None
        return IngestedFile(source_modified_at=(ingested or {})[file.name])

    monkeypatch.setattr(MagReadings, "ingested", staticmethod(lookup))
    persist = AsyncMock(return_value=FILE_ID)
    monkeypatch.setattr(MagReadings, "persist", persist)
    return persist


def downloads(requested: list[str]) -> list[str]:
    return [entry for entry in requested if entry.startswith("GET") and entry.endswith(".nc")]


async def test_ingests_the_newest_day_in_the_window(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    yesterday, before = TODAY - timedelta(days=1), TODAY - timedelta(days=2)
    content = mag_netcdf(tmp_path)
    requested = serve(monkeypatch, archive([before, yesterday], content))
    persist = mock_readings(monkeypatch)
    job = AsyncMock()

    result = await mag_pipeline.run(payload(), job)

    assert result["product"] == "GEOF"
    assert result["spacecraft"] == 19
    assert result["available"] == 2
    assert result["skipped"] is False
    assert result["fileId"] == str(FILE_ID)
    assert result["points"] == {"EPN-x": 3, "EPN-y": 3, "EPN-z": 2, "total": 3}
    assert result["file"] == {
        "name": name(yesterday),
        "url": result["file"]["url"],
        "day": yesterday.isoformat(),
        "version": "2-0-4",
        "modifiedAt": MODIFIED_AT.isoformat(),
        "bytes": len(content),
    }
    assert result["file"]["url"].endswith(f"/magn-l2-avg1m/{yesterday:%Y/%m}/{name(yesterday)}")
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

    result = await mag_pipeline.run(payload(), job)

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
    republished = "Fri, 16 Oct 2026 04:24:00 GMT"
    serve(
        monkeypatch,
        archive([before, yesterday], mag_netcdf(tmp_path), {before: republished}),
    )
    persist = mock_readings(monkeypatch, {name(yesterday): MODIFIED_AT, name(before): MODIFIED_AT})

    result = await mag_pipeline.run(payload(), AsyncMock())

    assert result["file"]["name"] == name(before)
    assert result["file"]["modifiedAt"] == "2026-10-16T04:24:00+00:00"
    persist.assert_awaited_once()


async def test_a_file_without_last_modified_is_ingested_the_first_time(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    yesterday = TODAY - timedelta(days=1)
    serve(monkeypatch, archive([yesterday], mag_netcdf(tmp_path), {yesterday: None}))
    persist = mock_readings(monkeypatch)

    result = await mag_pipeline.run(payload(), AsyncMock())

    assert result["file"]["modifiedAt"] is None
    assert persist.await_args.args[2] is None


async def test_a_file_without_last_modified_is_not_ingested_again(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    yesterday = TODAY - timedelta(days=1)
    requested = serve(monkeypatch, archive([yesterday], b"", {yesterday: None}))
    persist = mock_readings(monkeypatch, {name(yesterday): None})

    result = await mag_pipeline.run(payload(), AsyncMock())

    assert result["skipped"] is True
    assert downloads(requested) == []
    persist.assert_not_awaited()


async def test_a_newest_day_without_last_modified_does_not_block_older_days(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    yesterday, before = TODAY - timedelta(days=1), TODAY - timedelta(days=2)
    serve(monkeypatch, archive([before, yesterday], mag_netcdf(tmp_path), {yesterday: None}))
    persist = mock_readings(monkeypatch, {name(yesterday): None})

    result = await mag_pipeline.run(payload(), AsyncMock())

    assert result["file"]["name"] == name(before)
    persist.assert_awaited_once()


async def test_reports_no_file_without_downloading_anything(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    requested = serve(monkeypatch, archive([TODAY - timedelta(days=20)], b""))
    persist = mock_readings(monkeypatch)
    job = AsyncMock()

    result = await mag_pipeline.run(payload(), job)

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
    requested = serve(monkeypatch, archive([day, date(2025, 1, 6)], mag_netcdf(tmp_path)))
    mock_readings(monkeypatch)

    result = await mag_pipeline.run(payload(date="2025-01-05"), AsyncMock())

    assert result["available"] == 1
    assert result["file"]["day"] == "2025-01-05"
    listings = [entry for entry in requested if entry.endswith("/")]
    assert listings == [
        "GET https://data.ngdc.noaa.gov/platforms/solar-space-observing-satellites/goes/"
        "goes19/l2/data/magn-l2-avg1m/2025/01/"
    ]
