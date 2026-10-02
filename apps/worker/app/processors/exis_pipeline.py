"""``exis-pipeline``: ingest one daily EXIS L1b file (every channel of one
product) into InfluxDB, and catalogue it in Postgres.

All archive knowledge lives in :mod:`app.clients.exis`; decoding and storing
live in :mod:`app.services.exis_readings`. This processor only decides which
day to ingest, skips a day already ingested, and reports progress. See
`docs/exis-pipeline.md`.

NOAA publishes EXIS one day at a time, about a day late, and sometimes
republishes a day. So each run walks the days in its window newest first and
ingests the first one that was never ingested under its name, or whose
``Last-Modified`` differs from what was recorded the last time it was. When
nothing changed, no file is downloaded: the run costs one listing plus one
``HEAD`` per day in the window.
"""

import asyncio
import uuid
from datetime import UTC, datetime
from typing import Any

import httpx

from app.clients.exis import ExisDownload, ExisDownloader, ExisFile, ExisProduct
from app.logging import get_logger
from app.models.jobs import ExisPipelinePayload
from app.services.exis_readings import ExisDecoded, ExisReadings, decode

log = get_logger(__name__)

REQUEST_TIMEOUT = 120


def _result(payload: ExisPipelinePayload, available: int, **fields: Any) -> dict[str, Any]:
    return {
        "product": payload.product,
        "spacecraft": payload.spacecraft,
        "file": None,
        "available": available,
        "skipped": False,
        "fileId": None,
        "points": None,
        **fields,
        "pipelineDate": datetime.now(UTC).isoformat(),
    }


def _describe(file: ExisFile, modified_at: datetime | None, size: int) -> dict[str, Any]:
    return {
        "name": file.name,
        "url": file.url,
        "day": file.day.isoformat(),
        "version": file.version_label,
        "modifiedAt": modified_at.isoformat() if modified_at else None,
        "bytes": size,
    }


async def _first_changed(
    downloader: ExisDownloader, readings: ExisReadings, available: list[ExisFile]
) -> tuple[ExisFile, datetime | None] | None:
    """The newest file never ingested under its name, or whose ``Last-Modified``
    differs from the one recorded.

    A file the server sends no ``Last-Modified`` for is ingested once and then
    left alone. Counting it as changed every time would re-ingest the newest
    day on every run and never reach an older one. A new ``_vX-Y-Z`` changes
    the name, so it is still picked up.
    """
    for file in available:
        modified_at = await downloader.modified_at(file)
        ingested = await readings.ingested(file)
        if ingested is None:
            return file, modified_at
        if modified_at is not None and modified_at != ingested.source_modified_at:
            return file, modified_at
    return None


async def run(payload: ExisPipelinePayload, job: Any) -> dict[str, Any]:
    product = ExisProduct(payload.product)
    readings = ExisReadings()

    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT, follow_redirects=True) as client:
        downloader = ExisDownloader(client, spacecraft=payload.spacecraft)
        if payload.date is not None:
            available = await downloader.list_day(product, payload.date)
        else:
            available = await downloader.list_recent(product, payload.lookback_days)
        await job.updateProgress(25)

        if not available:
            log.info(
                "no exis file in window",
                product=product.value,
                spacecraft=payload.spacecraft,
                date=payload.date.isoformat() if payload.date else None,
                lookback_days=payload.lookback_days,
            )
            await job.updateProgress(100)
            return _result(payload, 0)

        changed = await _first_changed(downloader, readings, available)
        if changed is None:
            log.info("exis files unchanged", product=product.value, available=len(available))
            await job.updateProgress(100)
            return _result(payload, len(available), skipped=True)

        file, modified_at = changed
        download: ExisDownload = await downloader.fetch(file)
    await job.updateProgress(50)

    decoded: ExisDecoded = await asyncio.to_thread(
        decode, download.content, product, payload.spacecraft
    )
    await job.updateProgress(75)

    file_id: uuid.UUID = await readings.persist(decoded, file, modified_at)
    await job.updateProgress(100)

    log.info(
        "ingested exis file",
        product=product.value,
        name=file.name,
        bytes=len(download.content),
        points=decoded.point_count,
    )
    return _result(
        payload,
        len(available),
        file=_describe(file, modified_at, len(download.content)),
        fileId=str(file_id),
        points=decoded.point_count,
    )
