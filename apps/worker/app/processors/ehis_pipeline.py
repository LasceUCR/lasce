"""``ehis-pipeline``: ingest one daily SEISS EHIS L1b heavy ion file into
InfluxDB, and catalogue it in Postgres.

All archive knowledge lives in :mod:`app.clients.ehis`; decoding and storing
live in :mod:`app.services.ehis_readings`. This processor only decides which
day to ingest, skips a day already ingested, and reports progress. See
`docs/ehis-pipeline.md`.

NOAA publishes the file one day at a time, about a day late, and sometimes
republishes a day. So, exactly as ``exis-pipeline`` and ``mag-pipeline`` do,
each run walks the days in its window newest first and ingests the first one
never ingested under its name, or whose ``Last-Modified`` differs from the
recorded one.
"""

import asyncio
import uuid
from datetime import UTC, datetime
from typing import Any

import httpx

from app.clients.ehis import EhisDownloader, EhisFile
from app.logging import get_logger
from app.models.jobs import EhisPipelinePayload
from app.services.ehis_readings import PRODUCT, EhisDecoded, EhisReadings, decode

log = get_logger(__name__)

REQUEST_TIMEOUT = 120


def _result(payload: EhisPipelinePayload, available: int, **fields: Any) -> dict[str, Any]:
    return {
        "product": PRODUCT,
        "spacecraft": payload.spacecraft,
        "file": None,
        "available": available,
        "skipped": False,
        "fileId": None,
        "points": None,
        **fields,
        "pipelineDate": datetime.now(UTC).isoformat(),
    }


def _describe(file: EhisFile, modified_at: datetime | None, size: int) -> dict[str, Any]:
    return {
        "name": file.name,
        "url": file.url,
        "day": file.day.isoformat(),
        "version": file.version_label,
        "modifiedAt": modified_at.isoformat() if modified_at else None,
        "bytes": size,
    }


async def _first_changed(
    downloader: EhisDownloader, readings: EhisReadings, available: list[EhisFile]
) -> tuple[EhisFile, datetime | None] | None:
    """The newest file never ingested under its name, or whose ``Last-Modified``
    differs from the one recorded. A file sent without ``Last-Modified`` is
    ingested once and then left alone (see ``exis_pipeline._first_changed``).
    """
    for file in available:
        modified_at = await downloader.modified_at(file)
        ingested = await readings.ingested(file)
        if ingested is None:
            return file, modified_at
        if modified_at is not None and modified_at != ingested.source_modified_at:
            return file, modified_at
    return None


async def run(payload: EhisPipelinePayload, job: Any) -> dict[str, Any]:
    readings = EhisReadings()

    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT, follow_redirects=True) as client:
        downloader = EhisDownloader(client, spacecraft=payload.spacecraft)
        if payload.date is not None:
            available = await downloader.list_day(payload.date)
        else:
            available = await downloader.list_recent(payload.lookback_days)
        await job.updateProgress(25)

        if not available:
            log.info(
                "no ehis file in window",
                spacecraft=payload.spacecraft,
                date=payload.date.isoformat() if payload.date else None,
                lookback_days=payload.lookback_days,
            )
            await job.updateProgress(100)
            return _result(payload, 0)

        changed = await _first_changed(downloader, readings, available)
        if changed is None:
            log.info("ehis files unchanged", available=len(available))
            await job.updateProgress(100)
            return _result(payload, len(available), skipped=True)

        file, modified_at = changed
        download = await downloader.fetch(file)
    await job.updateProgress(50)

    decoded: EhisDecoded = await asyncio.to_thread(decode, download.content, payload.spacecraft)
    await job.updateProgress(75)

    file_id: uuid.UUID = await readings.persist(decoded, file, modified_at)
    await job.updateProgress(100)

    log.info(
        "ingested ehis file",
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
