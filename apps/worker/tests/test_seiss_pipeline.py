"""The ``seiss-pipeline`` processor, with the archive served from memory.

The processor takes its window from the clock, so the days the fake archive
serves are named relative to today rather than hard-coded. The file it serves
is a real NetCDF built by ``test_seiss_readings``'s (EHIS) or
``test_seiss_sgps``'s (SGPS) fixture, so the pipeline decodes for real.
Persistence and the "already ingested?" lookup are mocked: both are covered in
``test_seiss_readings.py``, and only the pipeline's shape (which day, whether
it downloads, progress, the returned dict) is under test. Most cases run EHIS;
the flow is the same for every product.
"""

import uuid
from collections.abc import Callable
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock

import httpx
import pytest

from app.models.jobs import SeissPipelinePayload
from app.processors import seiss_pipeline
from app.services.seiss import SeissReadings
from app.services.seiss.readings import IngestedFile
from tests.test_seiss_readings import ehis_netcdf
from tests.test_seiss_sgps import sgps_netcdf

FILE_ID = uuid.UUID("55555555-5555-5555-5555-555555555555")
MODIFIED = "Thu, 15 Oct 2026 04:31:27 GMT"
MODIFIED_AT = datetime(2026, 10, 15, 4, 31, 27, tzinfo=UTC)
TODAY = datetime.now(UTC).date()


def name(day: date, product: str = "EHIS") -> str:
    if product == "SGPS":
        return f"sci_sgps-l2-avg1m_g19_d{day:%Y%m%d}_v3-0-3.nc"
    return f"ops_seis-l1b-ehis_g19_d{day:%Y%m%d}_v0-0-2.nc"


def payload(**changes: Any) -> SeissPipelinePayload:
    return SeissPipelinePayload.model_validate(
        {"product": "EHIS", "spacecraft": 19, "lookbackDays": 3, **changes}
    )


def archive(
    days: list[date],
    content: bytes,
    modified: dict[date, str | None] | None = None,
    product: str = "EHIS",
) -> Callable[[httpx.Request], httpx.Response]:
    """Month listings holding ``days``, a ``HEAD`` per file, and its bytes."""
    by_name = {name(day, product): day for day in days}

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
        seiss_pipeline.httpx,
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

    monkeypatch.setattr(SeissReadings, "ingested", staticmethod(lookup))
    persist = AsyncMock(return_value=FILE_ID)
    monkeypatch.setattr(SeissReadings, "persist", persist)
    return persist


def downloads(requested: list[str]) -> list[str]:
    return [entry for entry in requested if entry.startswith("GET") and entry.endswith(".nc")]


async def test_ingests_the_newest_day_in_the_window(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    yesterday, before = TODAY - timedelta(days=1), TODAY - timedelta(days=2)
    content = ehis_netcdf(tmp_path)
    requested = serve(monkeypatch, archive([before, yesterday], content))
    persist = mock_readings(monkeypatch)
    job = AsyncMock()

    result = await seiss_pipeline.run(payload(), job)

    assert result["product"] == "EHIS"
    assert result["spacecraft"] == 19
    assert result["available"] == 2
    assert result["skipped"] is False
    assert result["fileId"] == str(FILE_ID)
    assert result["points"]["H:E4"] == 4
    assert len(result["points"]) == 25
    assert result["file"] == {
        "name": name(yesterday),
        "url": result["file"]["url"],
        "day": yesterday.isoformat(),
        "version": "0-0-2",
        "modifiedAt": MODIFIED_AT.isoformat(),
        "bytes": len(content),
    }
    assert result["file"]["url"].endswith(f"/l1b/seis-l1b-ehis/{yesterday:%Y/%m}/{name(yesterday)}")
    assert downloads(requested) == [f"GET {result['file']['url']}"]
    decoded, file, modified_at = persist.await_args.args
    assert file.name == name(yesterday)
    assert modified_at == MODIFIED_AT
    assert decoded.satellite == "G19"
    job.updateProgress.assert_any_await(25)
    job.updateProgress.assert_any_await(50)
    job.updateProgress.assert_any_await(75)
    job.updateProgress.assert_awaited_with(100)


async def test_sgps_is_listed_decoded_and_stored_as_its_own_product(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    yesterday = TODAY - timedelta(days=1)
    requested = serve(monkeypatch, archive([yesterday], sgps_netcdf(tmp_path), product="SGPS"))
    persist = mock_readings(monkeypatch)
    readings: list[SeissReadings] = []
    original = SeissReadings.__init__

    def recording(self: SeissReadings, *args: Any, **kwargs: Any) -> None:
        original(self, *args, **kwargs)
        readings.append(self)

    monkeypatch.setattr(SeissReadings, "__init__", recording)

    result = await seiss_pipeline.run(payload(product="SGPS"), AsyncMock())

    assert result["product"] == "SGPS"
    assert result["file"]["name"] == name(yesterday, "SGPS")
    assert result["file"]["url"].endswith(
        f"/l2/data/sgps-l2-avg1m/{yesterday:%Y/%m}/{name(yesterday, 'SGPS')}"
    )
    assert len(result["points"]) == 28
    assert downloads(requested) == [f"GET {result['file']['url']}"]
    ((stored,),) = [readings]
    assert (stored.product, stored.measurement) == ("SGPS", "sgps_flux")
    persist.assert_awaited_once()


def test_a_product_the_pipeline_does_not_ingest_is_rejected() -> None:
    with pytest.raises(ValueError, match="product"):
        payload(product="MPSL")


async def test_an_unchanged_day_is_not_downloaded_again(monkeypatch: pytest.MonkeyPatch) -> None:
    yesterday = TODAY - timedelta(days=1)
    requested = serve(monkeypatch, archive([yesterday], b""))
    persist = mock_readings(monkeypatch, {name(yesterday): MODIFIED_AT})
    job = AsyncMock()

    result = await seiss_pipeline.run(payload(), job)

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
        archive([before, yesterday], ehis_netcdf(tmp_path), {before: republished}),
    )
    persist = mock_readings(monkeypatch, {name(yesterday): MODIFIED_AT, name(before): MODIFIED_AT})

    result = await seiss_pipeline.run(payload(), AsyncMock())

    assert result["file"]["name"] == name(before)
    assert result["file"]["modifiedAt"] == "2026-10-16T04:24:00+00:00"
    persist.assert_awaited_once()


async def test_a_file_without_last_modified_is_ingested_the_first_time(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    yesterday = TODAY - timedelta(days=1)
    serve(monkeypatch, archive([yesterday], ehis_netcdf(tmp_path), {yesterday: None}))
    persist = mock_readings(monkeypatch)

    result = await seiss_pipeline.run(payload(), AsyncMock())

    assert result["file"]["modifiedAt"] is None
    assert persist.await_args.args[2] is None


async def test_a_file_without_last_modified_is_not_ingested_again(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    yesterday = TODAY - timedelta(days=1)
    requested = serve(monkeypatch, archive([yesterday], b"", {yesterday: None}))
    persist = mock_readings(monkeypatch, {name(yesterday): None})

    result = await seiss_pipeline.run(payload(), AsyncMock())

    assert result["skipped"] is True
    assert downloads(requested) == []
    persist.assert_not_awaited()


async def test_a_newest_day_without_last_modified_does_not_block_older_days(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    yesterday, before = TODAY - timedelta(days=1), TODAY - timedelta(days=2)
    serve(monkeypatch, archive([before, yesterday], ehis_netcdf(tmp_path), {yesterday: None}))
    persist = mock_readings(monkeypatch, {name(yesterday): None})

    result = await seiss_pipeline.run(payload(), AsyncMock())

    assert result["file"]["name"] == name(before)
    persist.assert_awaited_once()


async def test_reports_no_file_without_downloading_anything(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    requested = serve(monkeypatch, archive([TODAY - timedelta(days=20)], b""))
    persist = mock_readings(monkeypatch)
    job = AsyncMock()

    result = await seiss_pipeline.run(payload(), job)

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
    requested = serve(monkeypatch, archive([day, date(2025, 1, 6)], ehis_netcdf(tmp_path)))
    mock_readings(monkeypatch)

    result = await seiss_pipeline.run(payload(date="2025-01-05"), AsyncMock())

    assert result["available"] == 1
    assert result["file"]["day"] == "2025-01-05"
    listings = [entry for entry in requested if entry.endswith("/")]
    assert listings == [
        "GET https://data.ngdc.noaa.gov/platforms/solar-space-observing-satellites/goes/"
        "goes19/l1b/seis-l1b-ehis/2025/01/"
    ]
