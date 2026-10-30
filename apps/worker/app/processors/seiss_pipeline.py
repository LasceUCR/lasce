"""``seiss-pipeline``: ingest one daily file of one SEISS product into
InfluxDB, and catalogue it in Postgres.

All archive knowledge lives in :mod:`app.clients.seiss`; decoding lives in the
product's module under :mod:`app.services.seiss`, and storing in
:mod:`app.services.seiss.readings`. This processor only decides which day to
ingest, skips a day already ingested, and reports progress. Each product has
its own schedule, so a failed run of one never holds up another. See
`docs/seiss-pipeline.md`.

NOAA publishes the files one day at a time, about a day late, and sometimes
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

from app.clients.seiss import SeissDownloader, SeissFile, SeissProduct
from app.logging import get_logger
from app.models.jobs import SeissPipelinePayload
from app.services.seiss import DECODERS, SeissDecoded, SeissReadings

log = get_logger(__name__)

REQUEST_TIMEOUT = 120


def _result(payload: SeissPipelinePayload, available: int, **fields: Any) -> dict[str, Any]:
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


def _describe(file: SeissFile, modified_at: datetime | None, size: int) -> dict[str, Any]:
    return {
        "name": file.name,
        "url": file.url,
        "day": file.day.isoformat(),
        "version": file.version_label,
        "modifiedAt": modified_at.isoformat() if modified_at else None,
        "bytes": size,
    }


async def _first_changed(
    downloader: SeissDownloader, readings: SeissReadings, available: list[SeissFile]
) -> tuple[SeissFile, datetime | None] | None:
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


async def run(payload: SeissPipelinePayload, job: Any) -> dict[str, Any]:
    product = SeissProduct(payload.product)
    decoder = DECODERS[product]
    readings = SeissReadings(product, decoder.measurement)

    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT, follow_redirects=True) as client:
        downloader = SeissDownloader(client, product, spacecraft=payload.spacecraft)
        if payload.date is not None:
            available = await downloader.list_day(payload.date)
        else:
            available = await downloader.list_recent(payload.lookback_days)
        await job.updateProgress(25)

        if not available:
            log.info(
                "no seiss file in window",
                product=product.value,
                spacecraft=payload.spacecraft,
                date=payload.date.isoformat() if payload.date else None,
                lookback_days=payload.lookback_days,
            )
            await job.updateProgress(100)
            return _result(payload, 0)

        changed = await _first_changed(downloader, readings, available)
        if changed is None:
            log.info("seiss files unchanged", product=product.value, available=len(available))
            await job.updateProgress(100)
            return _result(payload, len(available), skipped=True)

        file, modified_at = changed
        download = await downloader.fetch(file)
    await job.updateProgress(50)

    decoded: SeissDecoded = await asyncio.to_thread(
        decoder.decode, download.content, payload.spacecraft
    )
    await job.updateProgress(75)

    file_id: uuid.UUID = await readings.persist(decoded, file, modified_at)
    await job.updateProgress(100)

    log.info(
        "ingested seiss file",
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
